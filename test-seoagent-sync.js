#!/usr/bin/env node

/**
 * Test GSC Analytics Sync for SEOAgent.com
 */

async function testSEOAgentSync() {
  console.log('🔧 Testing GSC Analytics Sync for SEOAgent.com...');
  console.log('');

  const payload = {
    userToken: '71d3a313-563d-4701-afa5-59d3ba8d7a9c',
    siteUrl: 'sc-domain:seoagent.com',
    syncType: 'recent',
    daysBack: 7
  };

  try {
    console.log('🔄 Starting 7-day GSC analytics sync for SEOAgent.com...');
    console.log(`   Site: ${payload.siteUrl}`);
    console.log(`   Days back: ${payload.daysBack}`);
    console.log('');

    const response = await fetch('http://localhost:3000/api/gsc/sync-analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ SEOAgent.com GSC Analytics sync completed successfully!');
      console.log('');
      console.log('📊 Sync Results:');
      console.log(`   Records processed: ${result.data.recordsProcessed}`);
      console.log(`   Dimensions synced: ${result.data.dimensionsSynced?.join(', ')}`);
      console.log(`   Completed at: ${result.data.completedAt}`);
      
      if (result.data.recordsProcessed > 0) {
        console.log('');
        console.log('🎉 SUCCESS! SEOAgent.com has GSC search data!');
      } else {
        console.log('');
        console.log('⚠️ No records processed. Possible reasons:');
        console.log('   1. SEOAgent.com might be a new site with limited search data');
        console.log('   2. Data might already be synced and up to date');
        console.log('   3. GSC might not have data for the 7-day period');
      }
    } else {
      console.error('❌ SEOAgent.com GSC Analytics sync failed:');
      console.error(`   Error: ${result.error}`);
      console.error(`   Message: ${result.message}`);
    }

  } catch (error) {
    console.error('❌ Test failed:');
    console.error(`   ${error.message}`);
    console.error('');
    console.error('💡 Make sure your development server is running:');
    console.error('   npm run dev');
  }
}

testSEOAgentSync();