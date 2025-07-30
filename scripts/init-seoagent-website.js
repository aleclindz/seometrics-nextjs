#!/usr/bin/env node
/**
 * Database Initialization Script for SEOAgent.com
 * Creates the website record if it doesn't exist
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_TOKEN = '1c9d8bc5-14eb-4223-a6ff-8c69d6aab1d8';
const TARGET_DOMAIN = 'seoagent.com';

// You need to provide the user token that should own this website
// This should be the token from login_users table for the admin user
const ADMIN_USER_TOKEN = process.env.ADMIN_USER_TOKEN;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!ADMIN_USER_TOKEN) {
  console.error('❌ Missing ADMIN_USER_TOKEN environment variable');
  console.error('Please set ADMIN_USER_TOKEN to the user token that should own seoagent.com');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Simple UUID v4 generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function initializeSeoagentWebsite() {
  console.log('🚀 Initializing SEOAgent.com Website');
  console.log('===================================');
  console.log(`Target Domain: ${TARGET_DOMAIN}`);
  console.log(`Target Token: ${TARGET_TOKEN}`);
  console.log(`Admin User Token: ${ADMIN_USER_TOKEN}`);
  console.log('');

  try {
    // 1. Verify admin user exists
    console.log('1️⃣ Verifying admin user...');
    const { data: adminUser, error: adminError } = await supabase
      .from('login_users')
      .select('*')
      .eq('token', ADMIN_USER_TOKEN)
      .single();

    if (adminError || !adminUser) {
      console.error('❌ Admin user not found with token:', ADMIN_USER_TOKEN);
      console.error('Available users:');
      
      const { data: allUsers } = await supabase
        .from('login_users')
        .select('token, email, created_at');
        
      if (allUsers && allUsers.length > 0) {
        allUsers.forEach(user => {
          console.log(`   - ${user.email} (${user.token})`);
        });
      } else {
        console.log('   No users found in database');
      }
      process.exit(1);
    }

    console.log('✅ Admin user found:', adminUser.email);

    // 2. Check if website already exists
    console.log('');
    console.log('2️⃣ Checking if website already exists...');
    const { data: existingWebsite, error: existingError } = await supabase
      .from('websites')
      .select('*')
      .eq('website_token', TARGET_TOKEN)
      .single();

    if (existingWebsite) {
      console.log('✅ Website already exists:');
      console.log(`   Domain: ${existingWebsite.domain}`);
      console.log(`   User: ${existingWebsite.user_token}`);
      console.log(`   Meta Tags Enabled: ${existingWebsite.enable_meta_tags}`);
      console.log(`   Image Tags Enabled: ${existingWebsite.enable_image_tags}`);
      console.log(`   Created: ${existingWebsite.created_at}`);
      
      // Update if needed
      if (existingWebsite.domain !== TARGET_DOMAIN || 
          existingWebsite.user_token !== ADMIN_USER_TOKEN) {
        console.log('');
        console.log('🔄 Updating existing website...');
        
        const { data: updatedWebsite, error: updateError } = await supabase
          .from('websites')
          .update({
            domain: TARGET_DOMAIN,
            user_token: ADMIN_USER_TOKEN,
            enable_meta_tags: true,
            enable_image_tags: true,
            updated_at: new Date().toISOString()
          })
          .eq('website_token', TARGET_TOKEN)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Error updating website:', updateError.message);
          process.exit(1);
        }

        console.log('✅ Website updated successfully');
      }
    } else {
      // 3. Create new website
      console.log('');
      console.log('3️⃣ Creating new website...');
      
      const { data: newWebsite, error: createError } = await supabase
        .from('websites')
        .insert({
          website_token: TARGET_TOKEN,
          user_token: ADMIN_USER_TOKEN,
          domain: TARGET_DOMAIN,
          language: 'english',
          enable_meta_tags: true,
          enable_image_tags: true,
          meta_tags: 0,
          image_tags: 0
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating website:', createError.message);
        process.exit(1);
      }

      console.log('✅ Website created successfully:');
      console.log(`   ID: ${newWebsite.id}`);
      console.log(`   Domain: ${newWebsite.domain}`);
      console.log(`   Token: ${newWebsite.website_token}`);
      console.log(`   Created: ${newWebsite.created_at}`);
    }

    // 4. Test the setup
    console.log('');
    console.log('4️⃣ Testing API endpoints...');
    
    // Test generate-meta-tags endpoint
    console.log('Testing Meta Tags API...');
    try {
      const metaResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-meta-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          url: `https://${TARGET_DOMAIN}`,
          id: TARGET_TOKEN
        })
      });

      if (metaResponse.ok) {
        const metaData = await metaResponse.json();
        console.log('✅ Meta Tags API working:', metaData);
      } else {
        const errorText = await metaResponse.text();
        console.log('⚠️ Meta Tags API error:', errorText);
      }
    } catch (apiError) {
      console.log('⚠️ Meta Tags API test failed:', apiError.message);
    }

    // Test generate-image-alt endpoint
    console.log('Testing Alt Tags API...');
    try {
      const altResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-image-alt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          id: TARGET_TOKEN,
          images: [`https://${TARGET_DOMAIN}/test-image.jpg`]
        })
      });

      if (altResponse.ok) {
        const altData = await altResponse.json();
        console.log('✅ Alt Tags API working:', altData);
      } else {
        const errorText = await altResponse.text();
        console.log('⚠️ Alt Tags API error:', errorText);
      }
    } catch (apiError) {
      console.log('⚠️ Alt Tags API test failed:', apiError.message);
    }

    console.log('');
    console.log('🎉 SEOAgent.com website initialization completed!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Add the script to your website HTML:');
    console.log('   <script src="/smart.js"></script>');
    console.log('   <script>const idv = \\'1c9d8bc5-14eb-4223-a6ff-8c69d6aab1d8\\';</script>');
    console.log('2. Visit your website to test the functionality');
    console.log('3. Check the debug dashboard at /debug-seo');

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Helper function to create admin user if needed
async function createAdminUser(email) {
  console.log('Creating admin user...');
  
  const { data: newUser, error: createError } = await supabase
    .from('login_users')
    .insert({
      email: email,
      token: generateUUID(),
      auth_user_id: generateUUID() // You might want to use a real auth user ID
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ Error creating admin user:', createError.message);
    return null;
  }

  console.log('✅ Admin user created:', newUser.email, newUser.token);
  return newUser;
}

// Command line arguments
const args = process.argv.slice(2);
if (args.includes('--create-admin')) {
  const email = args[args.indexOf('--create-admin') + 1];
  if (email) {
    createAdminUser(email).then(user => {
      if (user) {
        console.log('Admin user created. Set ADMIN_USER_TOKEN to:', user.token);
      }
    }).catch(console.error);
  } else {
    console.error('Please provide an email: --create-admin admin@example.com');
  }
} else {
  // Run the main initialization
  initializeSeoagentWebsite().catch(console.error);
}