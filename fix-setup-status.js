#!/usr/bin/env node

/**
 * Fix Setup Status Script
 * 
 * This script directly updates the database to fix the incorrect setup status
 * for translateyoutubevideos.com based on the actual connection status.
 * 
 * Usage: node fix-setup-status.js
 */

async function fixSetupStatus() {
  const apiUrl = 'http://localhost:3000/api/website/setup-status';
  
  const payload = {
    userToken: '71d3a313-563d-4701-afa5-59d3ba8d7a9c',
    domain: 'translateyoutubevideos.com',
    // Based on the console logs showing all services are actually connected
    gscStatus: 'connected',           // GSC API shows "connected": true
    seoagentjsStatus: 'active',       // Shows "active" in logs
    cmsStatus: 'connected',           // Shows active Strapi connection 
    hostingStatus: 'connected'        // Shows Lovable connection exists
  };

  try {
    console.log('🔧 Fixing setup status in database...');
    console.log(`   Domain: ${payload.domain}`);
    console.log(`   GSC: ${payload.gscStatus}`);
    console.log(`   SEOAgent.js: ${payload.seoagentjsStatus}`);
    console.log(`   CMS: ${payload.cmsStatus}`);
    console.log(`   Hosting: ${payload.hostingStatus}`);
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
      console.log('✅ Setup status successfully updated in database!');
      console.log('');
      console.log('📊 New Status:');
      console.log(`   Progress: 100% (4/4 services connected)`);
      console.log(`   GSC Status: connected`);
      console.log(`   SEOAgent.js: active`);
      console.log(`   CMS: connected`);
      console.log(`   Hosting: connected`);
      console.log('');
      console.log('🎉 Refresh the translateyoutubevideos.com page to see 100% progress!');
    } else {
      console.error('❌ Failed to update setup status:');
      console.error(`   Error: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Failed to fix setup status:');
    console.error(`   ${error.message}`);
    console.error('');
    console.error('💡 Make sure your development server is running:');
    console.error('   npm run dev');
  }
}

// Run the fix
fixSetupStatus();