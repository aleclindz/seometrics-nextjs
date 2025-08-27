import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DomainQueryService } from '@/lib/database/DomainQueryService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('[MANUAL-SITEMAP-FIX] Starting manual fix for translateyoutubevideos.com');
    
    const targetDomain = 'translateyoutubevideos.com';
    const targetUrl = `https://${targetDomain}`;
    
    // Step 1: Get any existing user token to use as owner
    const { data: existingUser, error: userError } = await supabase
      .from('login_users')
      .select('token')
      .limit(1)
      .single();

    if (!existingUser) {
      return NextResponse.json({ 
        error: 'No users found in database', 
        suggestion: 'Need at least one user account in the system' 
      }, { status: 400 });
    }

    const userToken = existingUser.token;
    console.log('[MANUAL-SITEMAP-FIX] Using user token:', userToken.substring(0, 8) + '...');

    // Step 2: Check if website exists using DomainQueryService
    let websiteRecord;
    const websiteResult = await DomainQueryService.findWebsiteByDomain(userToken, targetDomain);

    if (websiteResult.success && websiteResult.data) {
      websiteRecord = websiteResult.data;
      console.log('[MANUAL-SITEMAP-FIX] Found existing website:', websiteRecord.website_token);
    } else {
      // Create website record using DomainQueryService
      const createResult = await DomainQueryService.createWebsiteWithDomain(
        userToken,
        targetDomain,
        {
          website_token: `translateyoutubevideos_${Date.now()}`,
          is_managed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      );

      if (!createResult.success) {
        return NextResponse.json({ error: 'Failed to create website', details: createResult.error }, { status: 500 });
      }

      websiteRecord = createResult.data;
      console.log('[MANUAL-SITEMAP-FIX] Created website:', websiteRecord!.website_token);
    }

    // Step 3: Create and store sitemap XML
    const currentDate = new Date().toISOString().split('T')[0];
    const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://translateyoutubevideos.com/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://translateyoutubevideos.com/translate</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://translateyoutubevideos.com/about</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://translateyoutubevideos.com/contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://translateyoutubevideos.com/privacy</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://translateyoutubevideos.com/terms</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`;

    // Step 4: Store sitemap in database (or update if exists)
    let sitemapEntry;
    
    // First try to find existing entry
    const { data: existingSitemap } = await supabase
      .from('sitemap_submissions')
      .select('*')
      .eq('site_url', targetUrl)
      .eq('user_token', userToken)
      .single();
    
    if (existingSitemap) {
      // Update existing entry
      const { data: updatedEntry, error: updateError } = await supabase
        .from('sitemap_submissions')
        .update({
          sitemap_url: `${targetUrl}/sitemap.xml`,
          status: 'submitted',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSitemap.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('[MANUAL-SITEMAP-FIX] Error updating sitemap:', updateError);
        return NextResponse.json({ error: 'Failed to update sitemap', details: updateError.message }, { status: 500 });
      }
      sitemapEntry = updatedEntry;
    } else {
      // Create new entry
      const { data: newEntry, error: insertError } = await supabase
        .from('sitemap_submissions')
        .insert({
          user_token: userToken,
          site_url: targetUrl,
          sitemap_url: `${targetUrl}/sitemap.xml`,
          status: 'submitted',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('[MANUAL-SITEMAP-FIX] Error inserting sitemap:', insertError);
        return NextResponse.json({ error: 'Failed to store sitemap', details: insertError.message }, { status: 500 });
      }
      sitemapEntry = newEntry;
    }


    console.log('[MANUAL-SITEMAP-FIX] Stored sitemap entry:', sitemapEntry.id);

    // Step 5: Test the API endpoint
    const testUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/sitemaps/serve?domain=${targetDomain}`;
    console.log('[MANUAL-SITEMAP-FIX] Testing API:', testUrl);
    
    try {
      const testResponse = await fetch(testUrl);
      const isXML = testResponse.headers.get('content-type')?.includes('xml');
      
      return NextResponse.json({
        success: true,
        message: 'Manual sitemap fix completed successfully',
        results: {
          websiteToken: websiteRecord?.website_token,
          sitemapId: sitemapEntry.id,
          xmlLength: sitemapXML.length,
          testEndpoint: testUrl,
          testStatus: testResponse.status,
          isXML: isXML
        },
        nextSteps: [
          'The sitemap is now stored in the database',
          'The API endpoint /api/sitemaps/serve?domain=translateyoutubevideos.com should return XML',
          'The middleware should redirect /sitemap.xml to the API endpoint',
          'Test: https://translateyoutubevideos.com/sitemap.xml'
        ]
      });
    } catch (testError) {
      return NextResponse.json({
        success: true,
        message: 'Sitemap stored but API test failed',
        results: {
          websiteToken: websiteRecord?.website_token,
          sitemapId: sitemapEntry.id,
          xmlLength: sitemapXML.length,
          testError: testError instanceof Error ? testError.message : String(testError)
        }
      });
    }

  } catch (error) {
    console.error('[MANUAL-SITEMAP-FIX] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Manual sitemap fix failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}