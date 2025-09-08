#!/usr/bin/env node

/**
 * Final Comprehensive GSC Test
 * 
 * Let's try usebaxter.com which likely has the most search traffic
 */

async function finalGSCTest() {
  console.log('🎯 Final Comprehensive GSC Test');
  console.log('   Testing usebaxter.com (likely highest traffic site)');
  console.log('');

  const testConfigs = [
    {
      name: 'usebaxter.com - 30 days',
      userToken: '71d3a313-563d-4701-afa5-59d3ba8d7a9c',
      siteUrl: 'sc-domain:usebaxter.com',
      daysBack: 30
    },
    {
      name: 'usebaxter.com - 90 days', 
      userToken: '71d3a313-563d-4701-afa5-59d3ba8d7a9c',
      siteUrl: 'sc-domain:usebaxter.com',
      daysBack: 90
    },
    {
      name: 'seoagent.com - 90 days',
      userToken: '71d3a313-563d-4701-afa5-59d3ba8d7a9c', 
      siteUrl: 'sc-domain:seoagent.com',
      daysBack: 90
    }
  ];

  for (const config of testConfigs) {
    try {
      console.log(`🔄 Testing: ${config.name}`);
      
      const response = await fetch('http://localhost:3000/api/gsc/sync-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: config.userToken,
          siteUrl: config.siteUrl,
          syncType: 'recent',
          daysBack: config.daysBack
        })
      });

      if (response.ok) {
        const result = await response.json();
        const records = result.data.recordsProcessed || 0;
        const dimensions = result.data.dimensionsSynced?.length || 0;
        
        if (records > 0) {
          console.log(`   🎉 FOUND DATA: ${records} records, ${dimensions} dimensions`);
          console.log(`   🎯 SUCCESS! GSC sync is working for ${config.siteUrl}`);
        } else {
          console.log(`   ⚪ No data: 0 records, ${dimensions} dimensions attempted`);
        }
      } else {
        console.log(`   ❌ HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('🎯 CONCLUSION:');
  console.log('   If all tests show 0 records, then either:');
  console.log('   1. The GSC API is working but genuinely no search data exists');
  console.log('   2. The OAuth token scope is too restricted for search analytics'); 
  console.log('   3. The user needs to re-authenticate with broader permissions');
  console.log('   4. The sites are not verified in GSC for this user');
}

finalGSCTest();