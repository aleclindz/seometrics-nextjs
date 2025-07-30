/**
 * Merge Duplicate Websites Script
 * 
 * Merges GSC-created duplicate websites with original websites while preserving
 * existing meta tags, alt tags, and other data.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mapping of duplicates to merge
const MERGE_MAP = [
  {
    original: { id: 1, domain: 'translateyoutubevideos.com' },
    duplicate: { id: 7, domain: 'sc-domain:translateyoutubevideos.com' }
  },
  {
    original: { id: 3, domain: 'seometrics.ai' },
    duplicate: { id: 6, domain: 'sc-domain:seometrics.ai' }
  }
];

async function mergeDuplicateWebsites() {
  console.log('🔄 Starting website merge process...\n');

  try {
    for (const merge of MERGE_MAP) {
      console.log(`📋 Processing: ${merge.original.domain}`);
      console.log(`   Original ID: ${merge.original.id}`);
      console.log(`   Duplicate ID: ${merge.duplicate.id}`);

      // 1. Check if both websites exist
      const { data: originalWebsite } = await supabase
        .from('websites')
        .select('*')
        .eq('id', merge.original.id)
        .single();

      const { data: duplicateWebsite } = await supabase
        .from('websites')
        .select('*')
        .eq('id', merge.duplicate.id)
        .single();

      if (!originalWebsite) {
        console.log(`   ❌ Original website not found (ID: ${merge.original.id})`);
        continue;
      }

      if (!duplicateWebsite) {
        console.log(`   ℹ️  Duplicate website not found (ID: ${merge.duplicate.id}) - skipping`);
        continue;
      }

      // 2. Check for GSC properties associated with the duplicate
      const { data: gscProperties } = await supabase
        .from('gsc_properties')
        .select('*')
        .ilike('site_url', `%${merge.original.domain}%`);

      console.log(`   📊 Found ${gscProperties?.length || 0} GSC properties for ${merge.original.domain}`);

      // 3. Update GSC properties to reference the original website ID
      if (gscProperties && gscProperties.length > 0) {
        for (const property of gscProperties) {
          // Create a clean site_url (remove sc-domain: prefix if it exists)
          const cleanUrl = property.site_url.replace(/^sc-domain:/, '');
          
          console.log(`   🔗 Updating GSC property: ${property.site_url} → ${cleanUrl}`);
          
          const { error: updateError } = await supabase
            .from('gsc_properties')
            .update({ 
              site_url: cleanUrl
            })
            .eq('id', property.id);

          if (updateError) {
            console.log(`   ❌ Error updating GSC property: ${updateError.message}`);
          } else {
            console.log(`   ✅ Updated GSC property successfully`);
          }
        }
      }

      // 4. Check for any CMS connections that might reference the duplicate
      const { data: cmsConnections } = await supabase
        .from('cms_connections')
        .select('*')
        .eq('website_id', merge.duplicate.id);

      if (cmsConnections && cmsConnections.length > 0) {
        console.log(`   🔗 Found ${cmsConnections.length} CMS connections to update`);
        
        for (const connection of cmsConnections) {
          const { error: updateError } = await supabase
            .from('cms_connections')
            .update({ website_id: merge.original.id })
            .eq('id', connection.id);

          if (updateError) {
            console.log(`   ❌ Error updating CMS connection: ${updateError.message}`);
          } else {
            console.log(`   ✅ Updated CMS connection successfully`);
          }
        }
      }

      // 5. Check for any audit data that might reference the duplicate
      const { data: audits } = await supabase
        .from('seo_audits')
        .select('*')
        .eq('website_id', merge.duplicate.id);

      if (audits && audits.length > 0) {
        console.log(`   🔍 Found ${audits.length} audit records to update`);
        
        for (const audit of audits) {
          const { error: updateError } = await supabase
            .from('seo_audits')
            .update({ website_id: merge.original.id })
            .eq('id', audit.id);

          if (updateError) {
            console.log(`   ❌ Error updating audit: ${updateError.message}`);
          } else {
            console.log(`   ✅ Updated audit successfully`);
          }
        }
      }

      // 6. Delete the duplicate website
      console.log(`   🗑️  Deleting duplicate website (ID: ${merge.duplicate.id})`);
      
      const { error: deleteError } = await supabase
        .from('websites')
        .delete()
        .eq('id', merge.duplicate.id);

      if (deleteError) {
        console.log(`   ❌ Error deleting duplicate: ${deleteError.message}`);
      } else {
        console.log(`   ✅ Duplicate website deleted successfully`);
      }

      console.log(`   ✅ Merge completed for ${merge.original.domain}\n`);
    }

    // 7. Verify the final state
    console.log('📊 Final verification...');
    
    const { data: finalWebsites } = await supabase
      .from('websites')
      .select('id, domain, meta_tags, image_tags')
      .order('id');

    console.log('\n📋 Final website list:');
    finalWebsites?.forEach(site => {
      console.log(`   ${site.id}: ${site.domain} (${site.meta_tags} meta, ${site.image_tags} images)`);
    });

    console.log('\n🎉 Website merge process completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Test that your existing meta tags and alt tags still work');
    console.log('   2. Test that GSC data appears correctly in the dashboard');
    console.log('   3. Test that CMS connections still work if you had any');

  } catch (error) {
    console.error('❌ Error during merge process:', error);
  }
}

// Run the merge
mergeDuplicateWebsites();