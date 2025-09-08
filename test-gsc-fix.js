#!/usr/bin/env node

/**
 * Test GSC Analytics Sync Fix
 * 
 * This script tests if the OAuth authentication fix worked
 */

async function testGSCFix() {
  console.log('🔧 Testing GSC Analytics Sync Fix...');
  console.log('');

  const payload = {
    userToken: '71d3a313-563d-4701-afa5-59d3ba8d7a9c',
    siteUrl: 'sc-domain:translateyoutubevideos.com',
    syncType: 'recent',
    daysBack: 7
  };

  try {
    console.log('🔄 Starting 7-day GSC analytics sync with OAuth fix...');
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
      console.log('✅ GSC Analytics sync completed successfully!');
      console.log('');
      console.log('📊 Sync Results:');
      console.log(`   Records processed: ${result.data.recordsProcessed}`);
      console.log(`   Dimensions synced: ${result.data.dimensionsSynced?.join(', ')}`);
      console.log(`   Completed at: ${result.data.completedAt}`);
      
      if (result.data.recordsProcessed > 0) {
        console.log('');
        console.log('🎉 SUCCESS! GSC data is now being synced properly!');
      } else {
        console.log('');
        console.log('⚠️ Sync completed but no records processed. This could mean:');
        console.log('   1. No search data exists for the date range');
        console.log('   2. Data is already up to date');
        console.log('   3. Site has very low search traffic');
      }
    } else {
      console.error('❌ GSC Analytics sync failed:');
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

testGSCFix();