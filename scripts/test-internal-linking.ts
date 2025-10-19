/**
 * Test Script: Internal Linking System
 * 
 * This script tests the internal linking system by:
 * 1. Checking if migration was applied
 * 2. Finding briefs with link plans
 * 3. Showing example link plans
 * 4. Verifying link injection on published articles
 * 
 * Usage: npx tsx scripts/test-internal-linking.ts <userToken> <websiteToken>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testInternalLinking(userToken: string, websiteToken: string) {
  console.log('\n🔍 Testing Internal Linking System');
  console.log('=====================================\n');

  // Test 1: Check if columns exist
  console.log('Test 1: Verify database schema...');
  try {
    const { data: briefs, error: briefsError } = await supabase
      .from('article_briefs')
      .select('id, title, internal_link_plan')
      .eq('user_token', userToken)
      .eq('website_token', websiteToken)
      .limit(1);

    if (briefsError) {
      console.error('❌ Error querying article_briefs:', briefsError.message);
      if (briefsError.message.includes('column') && briefsError.message.includes('internal_link_plan')) {
        console.log('\n⚠️  Migration not applied! Run: npx supabase db push');
      }
      return;
    }

    console.log('✅ article_briefs.internal_link_plan column exists\n');
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    return;
  }

  // Test 2: Find briefs with link plans
  console.log('Test 2: Find briefs with link plans...');
  const { data: briefsWithPlans, error: plansError } = await supabase
    .from('article_briefs')
    .select('id, title, article_role, internal_link_plan, topic_cluster_id')
    .eq('user_token', userToken)
    .eq('website_token', websiteToken)
    .not('internal_link_plan', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (plansError) {
    console.error('❌ Error:', plansError.message);
    return;
  }

  if (!briefsWithPlans || briefsWithPlans.length === 0) {
    console.log('⚠️  No briefs with link plans found.');
    console.log('   This is expected if Master Discovery hasn\'t run yet.\n');
    
    // Show total briefs for context
    const { count } = await supabase
      .from('article_briefs')
      .select('*', { count: 'exact', head: true })
      .eq('user_token', userToken)
      .eq('website_token', websiteToken);
    
    console.log(`   Total briefs for this website: ${count || 0}\n`);
  } else {
    console.log(`✅ Found ${briefsWithPlans.length} briefs with link plans\n`);

    // Show example
    const exampleBrief = briefsWithPlans[0];
    console.log('📋 Example Link Plan:');
    console.log(`   Brief: "${exampleBrief.title}" (${exampleBrief.article_role})`);
    console.log(`   Links:`, JSON.stringify(exampleBrief.internal_link_plan, null, 2));
    console.log();
  }

  // Test 3: Find published articles with injected links
  console.log('Test 3: Find articles with injected links...');
  
  // Get website_id for article_queue query
  const { data: website } = await supabase
    .from('websites')
    .select('id')
    .eq('website_token', websiteToken)
    .single();

  if (!website) {
    console.log('❌ Website not found');
    return;
  }

  const { data: publishedArticles, error: articlesError } = await supabase
    .from('article_queue')
    .select('id, title, injected_internal_links, status')
    .eq('user_token', userToken)
    .eq('website_id', website.id)
    .not('injected_internal_links', 'is', null)
    .limit(5);

  if (articlesError) {
    console.error('❌ Error:', articlesError.message);
    return;
  }

  if (!publishedArticles || publishedArticles.length === 0) {
    console.log('⚠️  No published articles with injected links found.');
    console.log('   This is expected if no articles have been published yet.\n');
  } else {
    console.log(`✅ Found ${publishedArticles.length} articles with injected links\n`);

    // Show example
    const exampleArticle = publishedArticles[0];
    console.log('📰 Example Injected Links:');
    console.log(`   Article: "${exampleArticle.title}" (${exampleArticle.status})`);
    console.log(`   Links:`, JSON.stringify(exampleArticle.injected_internal_links, null, 2));
    console.log();
  }

  // Test 4: Show statistics
  console.log('Test 4: Statistics...');
  
  const { count: totalBriefs } = await supabase
    .from('article_briefs')
    .select('*', { count: 'exact', head: true })
    .eq('user_token', userToken)
    .eq('website_token', websiteToken);

  const { count: briefsWithLinkPlans } = await supabase
    .from('article_briefs')
    .select('*', { count: 'exact', head: true })
    .eq('user_token', userToken)
    .eq('website_token', websiteToken)
    .not('internal_link_plan', 'is', null);

  const { count: totalArticles } = await supabase
    .from('article_queue')
    .select('*', { count: 'exact', head: true })
    .eq('user_token', userToken)
    .eq('website_id', website.id);

  const { count: articlesWithLinks } = await supabase
    .from('article_queue')
    .select('*', { count: 'exact', head: true })
    .eq('user_token', userToken)
    .eq('website_id', website.id)
    .not('injected_internal_links', 'is', null);

  console.log(`   Total briefs: ${totalBriefs || 0}`);
  console.log(`   Briefs with link plans: ${briefsWithLinkPlans || 0} (${Math.round((briefsWithLinkPlans || 0) / (totalBriefs || 1) * 100)}%)`);
  console.log(`   Total articles: ${totalArticles || 0}`);
  console.log(`   Articles with injected links: ${articlesWithLinks || 0} (${Math.round((articlesWithLinks || 0) / (totalArticles || 1) * 100)}%)`);

  console.log('\n✅ Internal Linking System Test Complete!\n');
}

// Main execution
const userToken = process.argv[2];
const websiteToken = process.argv[3];

if (!userToken || !websiteToken) {
  console.error('Usage: npx tsx scripts/test-internal-linking.ts <userToken> <websiteToken>');
  console.error('\nExample:');
  console.error('  npx tsx scripts/test-internal-linking.ts user-token-123 website-token-456');
  process.exit(1);
}

testInternalLinking(userToken, websiteToken)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

