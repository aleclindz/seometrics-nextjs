import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('[SITEMAP-DEBUG-FULL] Starting comprehensive sitemap debugging');
    
    const targetDomain = 'translateyoutubevideos.com';
    const debugResults = {
      timestamp: new Date().toISOString(),
      targetDomain,
      checks: [] as any[],
      database: {} as any,
      routes: {} as any,
      generation: {} as any,
      issues: [] as any[],
      fixes: [] as any[]
    };

    // 1. Check database for sitemap entries
    console.log('[SITEMAP-DEBUG-FULL] Checking database for sitemap entries');
    try {
      const { data: sitemaps, error: sitemapError } = await supabase
        .from('sitemap_submissions')
        .select('*')
        .ilike('site_url', `%${targetDomain}%`);

      debugResults.database.sitemaps = {
        found: sitemaps?.length || 0,
        entries: sitemaps || [],
        error: sitemapError?.message || null
      };

      debugResults.checks.push({
        name: 'Database Sitemap Entries',
        status: sitemaps && sitemaps.length > 0 ? 'FOUND' : 'NOT_FOUND',
        details: `Found ${sitemaps?.length || 0} sitemap entries for ${targetDomain}`
      });

    } catch (error) {
      debugResults.issues.push({
        type: 'DATABASE_ERROR',
        description: 'Failed to query sitemap_submissions table',
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // 2. Check for websites table entries
    console.log('[SITEMAP-DEBUG-FULL] Checking websites table');
    try {
      const { data: websites, error: websiteError } = await supabase
        .from('websites')
        .select('*')
        .ilike('domain', `%${targetDomain}%`);

      debugResults.database.websites = {
        found: websites?.length || 0,
        entries: websites || [],
        error: websiteError?.message || null
      };

      debugResults.checks.push({
        name: 'Website Database Entries',
        status: websites && websites.length > 0 ? 'FOUND' : 'NOT_FOUND',
        details: `Found ${websites?.length || 0} website entries for ${targetDomain}`
      });

    } catch (error) {
      debugResults.issues.push({
        type: 'DATABASE_ERROR',
        description: 'Failed to query websites table',
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // 3. Test sitemap API route directly
    console.log('[SITEMAP-DEBUG-FULL] Testing sitemap API route');
    try {
      const sitemapUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/sitemaps/serve?domain=${targetDomain}`;
      console.log('[SITEMAP-DEBUG-FULL] Calling:', sitemapUrl);
      
      const response = await fetch(sitemapUrl);
      const responseText = await response.text();

      debugResults.routes.sitemapAPI = {
        url: sitemapUrl,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText.substring(0, 1000) + (responseText.length > 1000 ? '...' : ''),
        contentType: response.headers.get('content-type')
      };

      debugResults.checks.push({
        name: 'Sitemap API Route',
        status: response.ok ? 'SUCCESS' : 'FAILED',
        details: `API returned ${response.status}: ${response.statusText}`
      });

    } catch (error) {
      debugResults.issues.push({
        type: 'API_ROUTE_ERROR',
        description: 'Failed to call sitemap API route',
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // 4. Test sitemap generation directly
    console.log('[SITEMAP-DEBUG-FULL] Testing sitemap generation');
    try {
      const generationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/technical-seo/generate-sitemap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl: `https://${targetDomain}`,
          userToken: 'debug-token'
        })
      });

      const generationResult = await generationResponse.text();

      debugResults.generation.directTest = {
        status: generationResponse.status,
        statusText: generationResponse.statusText,
        result: generationResult.substring(0, 1000) + (generationResult.length > 1000 ? '...' : ''),
        success: generationResponse.ok
      };

      debugResults.checks.push({
        name: 'Sitemap Generation Test',
        status: generationResponse.ok ? 'SUCCESS' : 'FAILED',
        details: `Generation API returned ${generationResponse.status}`
      });

    } catch (error) {
      debugResults.issues.push({
        type: 'GENERATION_ERROR',
        description: 'Failed to test sitemap generation',
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // 5. Test actual domain sitemap URL
    console.log('[SITEMAP-DEBUG-FULL] Testing actual domain sitemap URL');
    try {
      const domainSitemapUrl = `https://${targetDomain}/sitemap.xml`;
      const domainResponse = await fetch(domainSitemapUrl);
      const domainResponseText = await domainResponse.text();

      debugResults.routes.domainSitemap = {
        url: domainSitemapUrl,
        status: domainResponse.status,
        statusText: domainResponse.statusText,
        headers: Object.fromEntries(domainResponse.headers.entries()),
        body: domainResponseText.substring(0, 1000) + (domainResponseText.length > 1000 ? '...' : ''),
        contentType: domainResponse.headers.get('content-type')
      };

      debugResults.checks.push({
        name: 'Domain Sitemap URL',
        status: domainResponse.ok ? 'SUCCESS' : 'FAILED',
        details: `${domainSitemapUrl} returned ${domainResponse.status}`
      });

    } catch (error) {
      debugResults.issues.push({
        type: 'DOMAIN_SITEMAP_ERROR',
        description: 'Failed to fetch domain sitemap URL',
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // 6. Check sitemap_submissions table structure
    console.log('[SITEMAP-DEBUG-FULL] Checking sitemap_submissions table structure');
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_info', { table_name: 'sitemap_submissions' });

      debugResults.database.tableStructure = {
        columns: tableInfo || [],
        error: tableError?.message || null
      };

      debugResults.checks.push({
        name: 'Sitemap Table Structure',
        status: tableInfo ? 'SUCCESS' : 'FAILED',
        details: `Table has ${tableInfo?.length || 0} columns`
      });

    } catch (error) {
      debugResults.database.tableStructure = {
        error: 'RPC function not available, table structure check skipped'
      };
    }

    // 7. Generate fixes based on issues found
    if (debugResults.database.sitemaps.found === 0) {
      debugResults.fixes.push({
        type: 'CREATE_SITEMAP_ENTRY',
        description: `Create sitemap entry for ${targetDomain}`,
        action: 'INSERT INTO sitemap_submissions (site_url, sitemap_url, status) VALUES (...)',
        priority: 'HIGH'
      });
    }

    if (debugResults.routes.sitemapAPI?.status !== 200) {
      debugResults.fixes.push({
        type: 'FIX_SITEMAP_API',
        description: 'Fix sitemap API route to return proper XML',
        action: 'Debug /api/sitemaps/serve route logic',
        priority: 'HIGH'
      });
    }

    if (debugResults.routes.domainSitemap?.status === 404) {
      debugResults.fixes.push({
        type: 'FIX_DOMAIN_ROUTING',
        description: 'Fix domain sitemap routing or redirect',
        action: 'Ensure sitemap.xml routes to correct API endpoint',
        priority: 'CRITICAL'
      });
    }

    // 8. Summary
    const successfulChecks = debugResults.checks.filter(c => c.status === 'SUCCESS' || c.status === 'FOUND').length;
    const totalChecks = debugResults.checks.length;
    const overallStatus = successfulChecks === totalChecks ? 'HEALTHY' : successfulChecks > totalChecks / 2 ? 'ISSUES_FOUND' : 'CRITICAL_ISSUES';

    console.log(`[SITEMAP-DEBUG-FULL] Debug complete: ${successfulChecks}/${totalChecks} checks passed`);

    return NextResponse.json({
      success: true,
      status: overallStatus,
      summary: `${successfulChecks}/${totalChecks} checks passed`,
      data: debugResults,
      message: `Comprehensive sitemap debugging complete for ${targetDomain}`
    });

  } catch (error) {
    console.error('[SITEMAP-DEBUG-FULL] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Sitemap debugging failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}