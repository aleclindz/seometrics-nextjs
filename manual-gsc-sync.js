#!/usr/bin/env node

/**
 * Manual GSC Search Analytics Sync Script
 * 
 * Usage:
 *   node manual-gsc-sync.js
 *   
 * This script will sync the last 30 days of GSC search analytics data
 * for translateyoutubevideos.com
 */

async function syncGSCAnalytics() {
  const apiUrl = 'http://localhost:3000/api/gsc/sync-analytics';
  
  const payload = {
    userToken: '71d3a313-563d-4701-afa5-59d3ba8d7a9c',
    siteUrl: 'sc-domain:translateyoutubevideos.com',
    syncType: 'recent',
    daysBack: 30
  };

  try {
    console.log('🔄 Starting GSC analytics sync...');
    console.log(`   Site: ${payload.siteUrl}`);
    console.log(`   Days back: ${payload.daysBack}`);
    console.log(`   Sync type: ${payload.syncType}`);
    console.log('');

    const response = await fetch(apiUrl, {
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
      console.log(`   Records processed: ${result.data.recordsProcessed || 'N/A'}`);
      console.log(`   Dimensions synced: ${result.data.dimensionsSynced?.join(', ') || 'N/A'}`);
      console.log(`   Completed at: ${result.data.completedAt}`);
    } else {
      console.error('❌ GSC Analytics sync failed:');
      console.error(`   Error: ${result.error}`);
      console.error(`   Message: ${result.message}`);
    }

  } catch (error) {
    console.error('❌ Failed to sync GSC analytics:');
    console.error(`   ${error.message}`);
    console.error('');
    console.error('💡 Make sure your development server is running:');
    console.error('   npm run dev');
  }
}

// Run the sync
syncGSCAnalytics();