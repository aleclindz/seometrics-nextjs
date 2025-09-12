"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        console.log('[FIX-TRANSLATEYOUTUBEVIDEOS] Starting fix for translateyoutubevideos.com sitemap');
        const targetDomain = 'translateyoutubevideos.com';
        const targetUrl = `https://${targetDomain}`;
        const fixResults = {
            timestamp: new Date().toISOString(),
            targetDomain,
            targetUrl,
            steps: [],
            fixes: [],
            issues: [],
            success: false
        };
        // Step 1: Check if website exists in database
        console.log('[FIX-TRANSLATEYOUTUBEVIDEOS] Step 1: Checking if website exists');
        const { data: existingWebsite, error: websiteError } = await supabase
            .from('websites')
            .select('*')
            .or(`domain.eq.${targetDomain},domain.eq.sc-domain:${targetDomain},url.eq.${targetUrl}`)
            .single();
        fixResults.steps.push({
            step: 1,
            description: 'Check if website exists in database',
            status: existingWebsite ? 'FOUND' : 'NOT_FOUND',
            details: existingWebsite ? `Found website with token: ${existingWebsite.website_token}` : 'Website not found in database'
        });
        let websiteRecord = existingWebsite;
        // Step 2: Create website record if it doesn't exist
        if (!websiteRecord) {
            console.log('[FIX-TRANSLATEYOUTUBEVIDEOS] Step 2: Creating website record');
            // Find a user token (we'll use a system token for this purpose)
            const { data: userData, error: userError } = await supabase
                .from('login_users')
                .select('token')
                .limit(1)
                .single();
            if (!userData) {
                fixResults.issues.push({
                    type: 'NO_USER_TOKEN',
                    description: 'No user tokens found in database',
                    severity: 'CRITICAL'
                });
                return server_1.NextResponse.json({ success: false, data: fixResults });
            }
            const websiteData = {
                user_token: userData.token,
                website_token: `translateyoutubevideos_${Date.now()}`,
                domain: targetDomain,
                url: targetUrl,
                name: 'Translate YouTube Videos',
                status: 'active',
                is_managed: true,
                created_at: new Date().toISOString()
            };
            const { data: newWebsite, error: createError } = await supabase
                .from('websites')
                .insert(websiteData)
                .select()
                .single();
            if (createError) {
                fixResults.issues.push({
                    type: 'WEBSITE_CREATE_FAILED',
                    description: 'Failed to create website record',
                    error: createError.message
                });
                return server_1.NextResponse.json({ success: false, data: fixResults });
            }
            websiteRecord = newWebsite;
            fixResults.fixes.push({
                type: 'WEBSITE_CREATED',
                description: `Created website record with token: ${newWebsite.website_token}`
            });
            fixResults.steps.push({
                step: 2,
                description: 'Create website record',
                status: 'SUCCESS',
                details: `Created website with token: ${newWebsite.website_token}`
            });
        }
        else {
            fixResults.steps.push({
                step: 2,
                description: 'Create website record',
                status: 'SKIPPED',
                details: 'Website already exists'
            });
        }
        // Step 3: Generate and store sitemap
        console.log('[FIX-TRANSLATEYOUTUBEVIDEOS] Step 3: Generating sitemap');
        const sitemapGenerationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/technical-seo/generate-sitemap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userToken: websiteRecord.user_token,
                siteUrl: targetUrl,
                submitToGSC: false
            })
        });
        if (!sitemapGenerationResponse.ok) {
            const errorText = await sitemapGenerationResponse.text();
            fixResults.issues.push({
                type: 'SITEMAP_GENERATION_FAILED',
                description: `Sitemap generation failed: ${sitemapGenerationResponse.status}`,
                error: errorText
            });
            fixResults.steps.push({
                step: 3,
                description: 'Generate sitemap',
                status: 'FAILED',
                details: `API returned ${sitemapGenerationResponse.status}: ${errorText}`
            });
        }
        else {
            const sitemapData = await sitemapGenerationResponse.json();
            fixResults.fixes.push({
                type: 'SITEMAP_GENERATED',
                description: `Sitemap generated successfully with ${sitemapData.data?.urlCount || 0} URLs`
            });
            fixResults.steps.push({
                step: 3,
                description: 'Generate sitemap',
                status: 'SUCCESS',
                details: `Generated sitemap with ${sitemapData.data?.urlCount || 0} URLs`
            });
        }
        // Step 4: Create dynamic sitemap.xml route
        console.log('[FIX-TRANSLATEYOUTUBEVIDEOS] Step 4: Creating dynamic sitemap route');
        // We need to create a dynamic route that can serve sitemaps for any domain
        // This will be done by creating a new API endpoint that checks the host header
        const dynamicRouteContent = `import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const host = request.headers.get('host');
    if (!host) {
      return new Response('Host header required', { status: 400 });
    }

    // Remove www. if present
    const domain = host.replace(/^www\\./, '');
    
    // Find website record by domain
    const { data: website } = await supabase
      .from('websites')
      .select('*')
      .or(\`domain.eq.\${domain},domain.eq.sc-domain:\${domain}\`)
      .single();

    if (!website) {
      return new Response('Website not found', { status: 404 });
    }

    // Get sitemap from serve API
    const sitemapResponse = await fetch(\`\${process.env.NEXT_PUBLIC_APP_URL}/api/sitemaps/serve?website_token=\${website.website_token}\`);
    
    if (!sitemapResponse.ok) {
      return new Response('Sitemap not found', { status: 404 });
    }

    const sitemapData = await sitemapResponse.json();
    
    if (!sitemapData.success || !sitemapData.sitemapXML) {
      return new Response('Sitemap XML not available', { status: 404 });
    }

    return new Response(sitemapData.sitemapXML, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('Sitemap serve error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}`;
        fixResults.steps.push({
            step: 4,
            description: 'Create dynamic sitemap route',
            status: 'INFO',
            details: 'Dynamic route code prepared (needs to be implemented as sitemap.xml middleware)'
        });
        // Step 5: Test the sitemap serve endpoint
        console.log('[FIX-TRANSLATEYOUTUBEVIDEOS] Step 5: Testing sitemap serve endpoint');
        const testResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sitemaps/serve?website_token=${websiteRecord.website_token}`);
        if (testResponse.ok) {
            const testData = await testResponse.json();
            if (testData.success && testData.sitemapXML) {
                fixResults.fixes.push({
                    type: 'SITEMAP_SERVE_WORKING',
                    description: 'Sitemap serve endpoint is working correctly'
                });
                fixResults.steps.push({
                    step: 5,
                    description: 'Test sitemap serve endpoint',
                    status: 'SUCCESS',
                    details: `Sitemap XML available with ${testData.urlCount || 'unknown'} URLs`
                });
            }
            else {
                fixResults.steps.push({
                    step: 5,
                    description: 'Test sitemap serve endpoint',
                    status: 'PARTIAL',
                    details: 'Endpoint responds but no XML content'
                });
            }
        }
        else {
            fixResults.steps.push({
                step: 5,
                description: 'Test sitemap serve endpoint',
                status: 'FAILED',
                details: `Serve endpoint returned ${testResponse.status}`
            });
        }
        // Step 6: Create manual workaround
        console.log('[FIX-TRANSLATEYOUTUBEVIDEOS] Step 6: Creating manual workaround');
        // Since we can't dynamically create routes at runtime, let's store the sitemap XML
        // in a way that can be served by a middleware or existing route
        const currentDate = new Date().toISOString().split('T')[0];
        const manualSitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://translateyoutubevideos.com/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
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
    <loc>https://translateyoutubevideos.com/translate</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
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
        // Store this in the sitemap_submissions table
        const { data: sitemapEntry, error: sitemapError } = await supabase
            .from('sitemap_submissions')
            .upsert({
            user_token: websiteRecord.user_token,
            site_url: targetUrl,
            sitemap_url: `${targetUrl}/sitemap.xml`,
            sitemap_xml: manualSitemapXML,
            status: 'submitted',
            submission_date: new Date().toISOString()
        })
            .select()
            .single();
        if (sitemapError) {
            fixResults.issues.push({
                type: 'SITEMAP_STORAGE_FAILED',
                description: 'Failed to store sitemap XML',
                error: sitemapError.message
            });
        }
        else {
            fixResults.fixes.push({
                type: 'SITEMAP_XML_STORED',
                description: 'Sitemap XML stored in database'
            });
        }
        fixResults.steps.push({
            step: 6,
            description: 'Store manual sitemap XML',
            status: sitemapError ? 'FAILED' : 'SUCCESS',
            details: sitemapError ? `Storage failed: ${sitemapError.message}` : 'Sitemap XML stored in database'
        });
        // Final status
        const failedSteps = fixResults.steps.filter(s => s.status === 'FAILED').length;
        const successfulSteps = fixResults.steps.filter(s => s.status === 'SUCCESS').length;
        fixResults.success = failedSteps === 0 && successfulSteps > 0;
        fixResults.fixes.push({
            type: 'NEXT_STEPS',
            description: 'To complete the fix, you need to create a middleware or modify the sitemap.xml route to serve domain-specific sitemaps',
            action: 'MANUAL_CODE_CHANGE_REQUIRED'
        });
        return server_1.NextResponse.json({
            success: fixResults.success,
            data: fixResults,
            message: `Fix completed with ${successfulSteps} successful steps and ${failedSteps} failures`,
            websiteToken: websiteRecord?.website_token
        });
    }
    catch (error) {
        console.error('[FIX-TRANSLATEYOUTUBEVIDEOS] Error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Fix failed',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
async function GET(request) {
    return POST(request);
}
