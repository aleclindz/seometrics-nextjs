#!/usr/bin/env node

/**
 * Detailed GSC Analytics Debug
 * 
 * This script will show exactly what's happening with the GSC API calls
 */

async function debugGSCDetailed() {
  console.log('🔍 Detailed GSC Analytics Debug for SEOAgent.com');
  console.log('');

  const payload = {
    userToken: '71d3a313-563d-4701-afa5-59d3ba8d7a9c',
    siteUrl: 'sc-domain:seoagent.com',
    syncType: 'recent',
    daysBack: 30  // Try 30 days instead of 7
  };

  try {
    console.log('📅 Testing 30-day sync to get more data...');
    console.log(`   Site: ${payload.siteUrl}`);
    console.log(`   Date range: Last 30 days`);
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

    console.log('📊 30-Day Sync Results:');
    console.log(`   Records processed: ${result.data.recordsProcessed}`);
    console.log(`   Dimensions synced: ${result.data.dimensionsSynced?.length || 0}`);
    console.log(`   Dimensions: ${result.data.dimensionsSynced?.join(', ') || 'None'}`);
    console.log('');

    // Now let's test the regular GSC performance API to see if it gets data
    console.log('🧪 Testing GSC Performance API directly...');
    const perfResponse = await fetch(`http://localhost:3000/api/gsc/performance?userToken=${payload.userToken}&domain=${encodeURIComponent(payload.siteUrl)}&days=30`);
    
    if (perfResponse.ok) {
      const perfData = await perfResponse.json();
      console.log('📈 GSC Performance API Results:');
      
      if (perfData.success && perfData.data) {
        console.log(`   Total rows: ${perfData.data.length || 0}`);
        
        if (perfData.data.length > 0) {
          const sample = perfData.data[0];
          console.log('   Sample data:');
          console.log(`     Date: ${sample.date || 'N/A'}`);
          console.log(`     Clicks: ${sample.clicks || 0}`);
          console.log(`     Impressions: ${sample.impressions || 0}`);
          console.log(`     CTR: ${sample.ctr || 0}`);
          console.log(`     Position: ${sample.position || 0}`);
        }
      } else {
        console.log('   No performance data returned');
      }
    } else {
      console.log(`   ❌ Performance API failed: ${perfResponse.status}`);
    }
    
    console.log('');

    // Test a very recent date range (last 3 days)
    console.log('📅 Testing last 3 days sync...');
    const recentResponse = await fetch('http://localhost:3000/api/gsc/sync-analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        daysBack: 3
      })
    });

    if (recentResponse.ok) {
      const recentResult = await recentResponse.json();
      console.log('📊 3-Day Sync Results:');
      console.log(`   Records processed: ${recentResult.data.recordsProcessed}`);
      console.log(`   Dimensions synced: ${recentResult.data.dimensionsSynced?.length || 0}`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('');
    console.error('💡 Make sure your development server is running:');
    console.error('   npm run dev');
  }
}

debugGSCDetailed();