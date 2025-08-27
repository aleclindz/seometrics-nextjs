#!/usr/bin/env node

/**
 * Cleanup Duplicate Websites Script
 * 
 * This script identifies and removes duplicate website entries while preserving:
 * 1. Websites with GSC data (sc-domain: prefix)
 * 2. Websites with existing meta/image tags
 * 3. Managed websites
 * 4. Websites belonging to different users
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🧹 Starting duplicate website cleanup...\n');

  try {
    // Get all websites to analyze duplicates
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select('*')
      .order('created_at', { ascending: true });

    if (websitesError) {
      throw new Error(`Failed to fetch websites: ${websitesError.message}`);
    }

    console.log(`📊 Found ${websites.length} total websites\n`);

    const duplicatesToDelete = [];
    const analysis = [];

    // Group by user_token and domain variations
    const userDomainGroups = {};

    for (const website of websites) {
      const cleanDomain = website.domain.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '');
      const groupKey = `${website.user_token}::${cleanDomain}`;

      if (!userDomainGroups[groupKey]) {
        userDomainGroups[groupKey] = [];
      }
      userDomainGroups[groupKey].push(website);
    }

    // Analyze each group for duplicates
    for (const [groupKey, group] of Object.entries(userDomainGroups)) {
      if (group.length > 1) {
        const [userToken, cleanDomain] = groupKey.split('::');
        
        // Sort by preference: sc-domain (GSC connected) > has data > managed > newer
        group.sort((a, b) => {
          // Prefer sc-domain: (GSC connected)
          const aHasPrefix = a.domain.startsWith('sc-domain:') ? 1 : 0;
          const bHasPrefix = b.domain.startsWith('sc-domain:') ? 1 : 0;
          if (aHasPrefix !== bHasPrefix) return bHasPrefix - aHasPrefix;

          // Prefer websites with data
          const aHasData = (a.meta_tags + a.image_tags) > 0 ? 1 : 0;
          const bHasData = (b.meta_tags + b.image_tags) > 0 ? 1 : 0;
          if (aHasData !== bHasData) return bHasData - aHasData;

          // Prefer managed websites
          const aManagedScore = a.is_managed ? 1 : 0;
          const bManagedScore = b.is_managed ? 1 : 0;
          if (aManagedScore !== bManagedScore) return bManagedScore - aManagedScore;

          // Prefer older (first created)
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        const keeper = group[0];
        const duplicates = group.slice(1);

        console.log(`🔍 Found duplicates for: ${cleanDomain}`);
        console.log(`   ✅ KEEPING: id=${keeper.id}, domain="${keeper.domain}", managed=${keeper.is_managed}, data=${keeper.meta_tags + keeper.image_tags}`);
        
        duplicates.forEach(d => {
          console.log(`   ❌ DELETING: id=${d.id}, domain="${d.domain}", managed=${d.is_managed}, data=${d.meta_tags + d.image_tags}`);
          duplicatesToDelete.push(d.id);
        });
        
        console.log('');

        analysis.push({
          domain: cleanDomain,
          userToken: userToken.substring(0, 8) + '...',
          keeper: {
            id: keeper.id,
            domain: keeper.domain,
            managed: keeper.is_managed,
            hasData: (keeper.meta_tags + keeper.image_tags) > 0,
            dataCount: keeper.meta_tags + keeper.image_tags
          },
          duplicatesDeleted: duplicates.length
        });
      }
    }

    if (duplicatesToDelete.length === 0) {
      console.log('✨ No duplicates found to clean up!');
      return;
    }

    console.log(`🗑️  Preparing to delete ${duplicatesToDelete.length} duplicate websites...\n`);

    // Delete duplicates
    const { error: deleteError } = await supabase
      .from('websites')
      .delete()
      .in('id', duplicatesToDelete);

    if (deleteError) {
      throw new Error(`Failed to delete duplicates: ${deleteError.message}`);
    }

    console.log('✅ Successfully cleaned up duplicate websites!\n');
    console.log('📋 SUMMARY:');
    console.log(`   • Total websites analyzed: ${websites.length}`);
    console.log(`   • Duplicate groups found: ${analysis.length}`);
    console.log(`   • Duplicates removed: ${duplicatesToDelete.length}`);
    console.log(`   • Websites remaining: ${websites.length - duplicatesToDelete.length}`);
    
    if (analysis.length > 0) {
      console.log('\n📊 CLEANUP DETAILS:');
      analysis.forEach(item => {
        console.log(`   • ${item.domain}: Kept ${item.keeper.domain} (${item.keeper.dataCount} tags), deleted ${item.duplicatesDeleted} duplicates`);
      });
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

main().then(() => {
  console.log('\n🎉 Cleanup complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});