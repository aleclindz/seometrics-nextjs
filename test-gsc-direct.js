#!/usr/bin/env node

/**
 * Direct GSC API Test
 * 
 * This will make a direct GSC API call to see exactly what's returned
 */

async function testGSCDirect() {
  console.log('🔍 Direct GSC Search Analytics API Test');
  console.log('');

  try {
    // Make a direct call to the working GSC performance endpoint to compare
    console.log('🧪 Testing working GSC Performance endpoint...');
    const perfResponse = await fetch(`http://localhost:3000/api/gsc/performance?userToken=71d3a313-563d-4701-afa5-59d3ba8d7a9c&domain=${encodeURIComponent('sc-domain:seoagent.com')}&days=30`);
    
    if (perfResponse.ok) {
      const perfData = await perfResponse.json();
      console.log('📈 Performance API Response:');
      console.log(`   Success: ${perfData.success}`);
      
      if (perfData.data && perfData.data.length > 0) {
        console.log(`   Total records: ${perfData.data.length}`);
        console.log(`   Sample record:`, JSON.stringify(perfData.data[0], null, 2));
      } else {
        console.log('   No performance data returned');
      }
    } else {
      console.log(`   ❌ Performance API failed: ${perfResponse.status} ${perfResponse.statusText}`);
    }
    
    console.log('');

    // Now test the regular GSC sync endpoint but just for one dimension
    console.log('🔬 Testing Analytics Sync (single dimension)...');
    const syncResponse = await fetch('http://localhost:3000/api/gsc/sync-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userToken: '71d3a313-563d-4701-afa5-59d3ba8d7a9c',
        siteUrl: 'sc-domain:seoagent.com',
        syncType: 'recent',
        daysBack: 30
      })
    });

    const syncData = await syncResponse.json();
    console.log('📊 Analytics Sync Response:');
    console.log(`   Success: ${syncData.success}`);
    console.log(`   Records: ${syncData.data?.recordsProcessed || 0}`);
    console.log(`   Dimensions: ${syncData.data?.dimensionsSynced?.join(', ') || 'none'}`);
    console.log('');

    // Test if we can access a known working GSC endpoint for this site
    console.log('🔗 Testing GSC Properties endpoint...');
    const propsResponse = await fetch(`http://localhost:3000/api/gsc/properties?userToken=71d3a313-563d-4701-afa5-59d3ba8d7a9c`);
    
    if (propsResponse.ok) {
      const propsData = await propsResponse.json();
      console.log('🏠 Properties Response:');
      
      if (propsData.sites && propsData.sites.length > 0) {
        console.log(`   Total properties: ${propsData.sites.length}`);
        
        // Check if seoagent.com is in the list
        const seoagentProperty = propsData.sites.find(site => 
          site.siteUrl === 'sc-domain:seoagent.com'
        );
        
        if (seoagentProperty) {
          console.log('   ✅ SEOAgent.com found in GSC properties');
          console.log(`   Permission level: ${seoagentProperty.permissionLevel}`);
        } else {
          console.log('   ❌ SEOAgent.com NOT found in GSC properties');
          console.log('   Available properties:');
          propsData.sites.forEach(site => {
            console.log(`     - ${site.siteUrl} (${site.permissionLevel})`);
          });
        }
      }
    } else {
      console.log(`   ❌ Properties API failed: ${propsResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGSCDirect();