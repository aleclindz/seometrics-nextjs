#!/usr/bin/env node
/**
 * Database Audit Script for SEO Agent
 * Checks website token existence and configuration
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_TOKEN = '1c9d8bc5-14eb-4223-a6ff-8c69d6aab1d8';
const TARGET_DOMAIN = 'seoagent.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function auditDatabase() {
  console.log('🔍 SEO Agent Database Audit');
  console.log('================================');
  console.log(`Target Token: ${TARGET_TOKEN}`);
  console.log(`Target Domain: ${TARGET_DOMAIN}`);
  console.log('');

  try {
    // 1. Check if website token exists
    console.log('1️⃣ Checking website token existence...');
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .eq('website_token', TARGET_TOKEN)
      .single();

    if (websiteError) {
      console.log('❌ Website token not found in database');
      console.log('Error:', websiteError.message);
      
      // Check if domain exists with different token
      console.log('');
      console.log('2️⃣ Checking if domain exists with different token...');
      const { data: domainCheck, error: domainError } = await supabase
        .from('websites')
        .select('*')
        .eq('domain', TARGET_DOMAIN);

      if (domainError) {
        console.log('❌ Error checking domain:', domainError.message);
      } else if (domainCheck && domainCheck.length > 0) {
        console.log('✅ Found domain with different token(s):');
        domainCheck.forEach((site, index) => {
          console.log(`   ${index + 1}. Token: ${site.website_token}`);
          console.log(`      Domain: ${site.domain}`);
          console.log(`      User: ${site.user_token}`);
          console.log(`      Created: ${site.created_at}`);
        });
      } else {
        console.log('❌ Domain not found in database');
      }
    } else {
      console.log('✅ Website token found!');
      console.log('');
      console.log('📊 Website Configuration:');
      console.log('------------------------');
      console.log(`Domain: ${website.domain}`);
      console.log(`User Token: ${website.user_token}`);
      console.log(`Language: ${website.language}`);
      console.log(`Meta Tags Enabled: ${website.enable_meta_tags}`);
      console.log(`Image Tags Enabled: ${website.enable_image_tags}`);
      console.log(`Meta Tags Count: ${website.meta_tags}`);
      console.log(`Image Tags Count: ${website.image_tags}`);
      console.log(`Created: ${website.created_at}`);
      console.log(`Updated: ${website.updated_at}`);

      // 3. Check associated user
      console.log('');
      console.log('3️⃣ Checking associated user...');
      const { data: user, error: userError } = await supabase
        .from('login_users')
        .select('*')
        .eq('token', website.user_token)
        .single();

      if (userError) {
        console.log('❌ Associated user not found');
        console.log('Error:', userError.message);
      } else {
        console.log('✅ Associated user found:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Auth User ID: ${user.auth_user_id}`);
        console.log(`   Created: ${user.created_at}`);
      }

      // 4. Check existing alt-tags
      console.log('');
      console.log('4️⃣ Checking existing alt-tags...');
      const { data: altTags, error: altError } = await supabase
        .from('alt_tags')
        .select('*')
        .eq('website_token', TARGET_TOKEN)
        .order('created_at', { ascending: false });

      if (altError) {
        console.log('❌ Error checking alt-tags:', altError.message);
      } else if (altTags && altTags.length > 0) {
        console.log(`✅ Found ${altTags.length} alt-tags:`);
        altTags.slice(0, 5).forEach((tag, index) => {
          console.log(`   ${index + 1}. ${tag.image_url.substring(0, 50)}...`);
          console.log(`      Alt: ${tag.alt_text}`);
          console.log(`      Created: ${tag.created_at}`);
        });
        if (altTags.length > 5) {
          console.log(`   ... and ${altTags.length - 5} more`);
        }
      } else {
        console.log('⚠️ No alt-tags found');
      }

      // 5. Check existing meta-tags
      console.log('');
      console.log('5️⃣ Checking existing meta-tags...');
      const { data: metaTags, error: metaError } = await supabase
        .from('meta_tags')
        .select('*')
        .eq('website_token', TARGET_TOKEN)
        .order('created_at', { ascending: false });

      if (metaError) {
        console.log('❌ Error checking meta-tags:', metaError.message);
      } else if (metaTags && metaTags.length > 0) {
        console.log(`✅ Found ${metaTags.length} meta-tags:`);
        metaTags.slice(0, 5).forEach((tag, index) => {
          console.log(`   ${index + 1}. ${tag.page_url.substring(0, 50)}...`);
          console.log(`      Title: ${tag.meta_title}`);
          console.log(`      Description: ${tag.meta_description.substring(0, 100)}...`);
          console.log(`      Created: ${tag.created_at}`);
        });
        if (metaTags.length > 5) {
          console.log(`   ... and ${metaTags.length - 5} more`);
        }
      } else {
        console.log('⚠️ No meta-tags found');
      }
    }

    // 6. Test API endpoints
    console.log('');
    console.log('6️⃣ Testing API endpoints...');
    
    // Test generate-meta-tags endpoint
    try {
      const metaResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-meta-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          url: 'https://seoagent.com',
          id: TARGET_TOKEN
        })
      });

      console.log(`Meta-tags API Status: ${metaResponse.status}`);
      if (!metaResponse.ok) {
        const errorText = await metaResponse.text();
        console.log(`Meta-tags API Error: ${errorText}`);
      } else {
        const metaData = await metaResponse.json();
        console.log('✅ Meta-tags API Response:', metaData);
      }
    } catch (apiError) {
      console.log('❌ Meta-tags API Test Failed:', apiError.message);
    }

    // Test generate-image-alt endpoint
    try {
      const altResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-image-alt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          id: TARGET_TOKEN,
          images: ['https://seoagent.com/test-image.jpg']
        })
      });

      console.log(`Alt-tags API Status: ${altResponse.status}`);
      if (!altResponse.ok) {
        const errorText = await altResponse.text();
        console.log(`Alt-tags API Error: ${errorText}`);
      } else {
        const altData = await altResponse.json();
        console.log('✅ Alt-tags API Response:', altData);
      }
    } catch (apiError) {
      console.log('❌ Alt-tags API Test Failed:', apiError.message);
    }

    console.log('');
    console.log('✅ Database audit completed!');

  } catch (error) {
    console.error('❌ Audit failed:', error);
  }
}

// Run the audit
auditDatabase().catch(console.error);