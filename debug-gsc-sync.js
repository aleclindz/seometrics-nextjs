#!/usr/bin/env node

/**
 * Debug GSC Sync Script
 * 
 * This script will help diagnose why the GSC sync isn't processing records
 */

async function debugGSCSync() {
  console.log('🔍 Debug GSC Sync - checking what might be wrong');
  console.log('');

  const userToken = '71d3a313-563d-4701-afa5-59d3ba8d7a9c';
  const siteUrl = 'sc-domain:translateyoutubevideos.com';

  try {
    // 1. Check GSC connection status first
    console.log('📡 Step 1: Checking GSC connection...');
    const gscResponse = await fetch(`http://localhost:3000/api/gsc/connection?userToken=${userToken}`);
    
    if (!gscResponse.ok) {
      throw new Error(`GSC connection check failed: ${gscResponse.status}`);
    }
    
    const gscData = await gscResponse.json();
    console.log(`   GSC Connected: ${gscData.connected}`);
    
    if (gscData.connected && gscData.connection) {
      console.log(`   Email: ${gscData.connection.email}`);
      console.log(`   Properties: ${gscData.connection.properties_count}`);
      console.log(`   Last sync: ${gscData.connection.last_sync_at}`);
      console.log(`   Expires: ${gscData.connection.expires_at}`);
      
      if (gscData.connection.sync_errors && gscData.connection.sync_errors.length > 0) {
        console.log('   ⚠️ Sync Errors:');
        gscData.connection.sync_errors.forEach(error => {
          console.log(`      ${error.property}: ${error.error}`);
        });
      }
    }
    console.log('');

    // 2. Check if the site property exists in GSC
    console.log('📡 Step 2: Checking GSC properties...');
    const propertiesResponse = await fetch(`http://localhost:3000/api/gsc/sites?userToken=${userToken}`);
    
    if (propertiesResponse.ok) {
      const propertiesData = await propertiesResponse.json();
      console.log(`   Total GSC properties: ${propertiesData.sites ? propertiesData.sites.length : 'N/A'}`);
      
      if (propertiesData.sites) {
        const targetProperty = propertiesData.sites.find(site => site.siteUrl === siteUrl);
        if (targetProperty) {
          console.log(`   ✅ Found target property: ${siteUrl}`);
          console.log(`      Permission level: ${targetProperty.permissionLevel}`);
        } else {
          console.log(`   ❌ Target property NOT found: ${siteUrl}`);
          console.log('   Available properties:');
          propertiesData.sites.forEach(site => {
            console.log(`      - ${site.siteUrl} (${site.permissionLevel})`);
          });
        }
      }
    } else {
      console.log(`   ❌ Failed to fetch GSC properties: ${propertiesResponse.status}`);
    }
    console.log('');

    // 3. Check existing data in database
    console.log('📊 Step 3: Checking existing GSC analytics data...');
    const dataCheckResponse = await fetch(`http://localhost:3000/api/gsc/analytics?userToken=${userToken}&siteUrl=${encodeURIComponent(siteUrl)}&days=30`);
    
    if (dataCheckResponse.ok) {
      const dataCheck = await dataCheckResponse.json();
      if (dataCheck.success && dataCheck.data) {
        console.log(`   Existing records found: ${dataCheck.data.length || 0}`);
        if (dataCheck.data.length > 0) {
          const latestRecord = dataCheck.data[0];
          console.log(`   Latest record date: ${latestRecord.date || 'N/A'}`);
          console.log(`   Latest clicks: ${latestRecord.clicks || 0}`);
          console.log(`   Latest impressions: ${latestRecord.impressions || 0}`);
        }
      } else {
        console.log('   No existing analytics data found');
      }
    } else {
      console.log(`   ❌ Failed to check existing data: ${dataCheckResponse.status}`);
    }
    console.log('');

    // 4. Try a simple 7-day sync instead of 30-day
    console.log('🔄 Step 4: Trying a smaller 7-day sync...');
    const smallSyncResponse = await fetch('http://localhost:3000/api/gsc/sync-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userToken,
        siteUrl,
        syncType: 'recent',
        daysBack: 7
      })
    });

    if (smallSyncResponse.ok) {
      const smallSyncResult = await smallSyncResponse.json();
      if (smallSyncResult.success) {
        console.log(`   ✅ 7-day sync completed`);
        console.log(`   Records processed: ${smallSyncResult.data.recordsProcessed || 'N/A'}`);
        console.log(`   Dimensions: ${smallSyncResult.data.dimensionsSynced?.join(', ') || 'N/A'}`);
      } else {
        console.log(`   ❌ 7-day sync failed: ${smallSyncResult.error}`);
      }
    } else {
      console.log(`   ❌ 7-day sync request failed: ${smallSyncResponse.status}`);
    }

    console.log('');
    console.log('🎯 Summary:');
    console.log('   If GSC is connected but no records are processed, possible reasons:');
    console.log('   1. The site might not have enough search data in the date range');
    console.log('   2. Permission issues with the specific property');
    console.log('   3. The data might already be up to date');
    console.log('   4. GSC API might be returning empty results');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('');
    console.error('💡 Make sure your development server is running:');
    console.error('   npm run dev');
  }
}

debugGSCSync();