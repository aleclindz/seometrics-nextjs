#!/usr/bin/env node

/**
 * Test GSC with Different Date Ranges
 * 
 * GSC data typically has a 2-3 day delay, so let's test older date ranges
 */

async function testGSCDates() {
  console.log('📅 Testing GSC Analytics with Different Date Ranges');
  console.log('   (GSC data usually has 2-3 day delay)');
  console.log('');

  const userToken = '71d3a313-563d-4701-afa5-59d3ba8d7a9c';
  const siteUrl = 'sc-domain:seoagent.com';
  
  const testRanges = [
    { name: 'Last 7 days (ending 3 days ago)', daysBack: 7, delayDays: 3 },
    { name: 'Last 14 days (ending 3 days ago)', daysBack: 14, delayDays: 3 },
    { name: 'August 2025 (full month)', daysBack: 30, delayDays: 8 },
    { name: 'Last 30 days (ending 5 days ago)', daysBack: 30, delayDays: 5 }
  ];

  for (const testRange of testRanges) {
    try {
      console.log(`🔄 Testing: ${testRange.name}`);
      
      // Calculate dates with delay
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - testRange.delayDays);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - testRange.daysBack + 1);
      
      console.log(`   Date range: ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`);
      
      const response = await fetch('http://localhost:3000/api/gsc/sync-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          siteUrl,
          syncType: 'recent',
          daysBack: testRange.daysBack
        })
      });

      if (response.ok) {
        const result = await response.json();
        const records = result.data.recordsProcessed || 0;
        const dimensions = result.data.dimensionsSynced?.length || 0;
        
        if (records > 0) {
          console.log(`   🎉 SUCCESS: ${records} records, ${dimensions} dimensions`);
        } else {
          console.log(`   ⚪ No data: 0 records, ${dimensions} dimensions`);
        }
      } else {
        console.log(`   ❌ HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('💡 If all tests show 0 records, the issue might be:');
  console.log('   1. GSC API authentication scope limitations');
  console.log('   2. Site not verified in GSC for the authenticated user');
  console.log('   3. Site genuinely has no search traffic');
  console.log('   4. Data transformation or date format issues');
}

testGSCDates();