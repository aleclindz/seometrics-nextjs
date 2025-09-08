#!/usr/bin/env node

/**
 * Sync All Websites GSC Analytics
 * 
 * This script will sync GSC analytics for ALL user websites
 */

async function syncAllGSC() {
  console.log('🚀 Syncing GSC Analytics for ALL Websites');
  console.log('');

  const userToken = '71d3a313-563d-4701-afa5-59d3ba8d7a9c';
  
  // List of all websites from the database
  const websites = [
    'sc-domain:usebaxter.com',
    'sc-domain:translateyoutubevideos.com', 
    'sc-domain:seoagent.com',
    'sc-domain:seometrics.ai',
    'sc-domain:aleclindz.com',
    'chatseeds.com'
  ];

  let successCount = 0;
  let errorCount = 0;
  const results = [];

  for (const siteUrl of websites) {
    try {
      console.log(`🔄 Syncing: ${siteUrl}`);
      
      const response = await fetch('http://localhost:3000/api/gsc/sync-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userToken,
          siteUrl,
          syncType: 'recent',
          daysBack: 30
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const records = result.data.recordsProcessed || 0;
        const dimensions = result.data.dimensionsSynced?.length || 0;
        
        console.log(`   ✅ Success: ${records} records, ${dimensions} dimensions`);
        results.push({ site: siteUrl, status: 'success', records, dimensions });
        successCount++;
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
        results.push({ site: siteUrl, status: 'error', error: result.error });
        errorCount++;
      }
      
      // Rate limiting - small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
      results.push({ site: siteUrl, status: 'exception', error: error.message });
      errorCount++;
    }
  }

  console.log('');
  console.log('📊 SYNC SUMMARY:');
  console.log(`   Total websites: ${websites.length}`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${errorCount}`);
  console.log('');

  console.log('📋 DETAILED RESULTS:');
  results.forEach(result => {
    if (result.status === 'success') {
      console.log(`   ✅ ${result.site}: ${result.records} records`);
    } else {
      console.log(`   ❌ ${result.site}: ${result.error}`);
    }
  });

  if (successCount > 0) {
    console.log('');
    console.log('🎉 GSC Analytics data has been synced for your websites!');
    console.log('   Check your dashboard to see the updated performance data.');
  }
}

syncAllGSC();