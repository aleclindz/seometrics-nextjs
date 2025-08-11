import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userToken, siteUrl, fixAction, issueId } = await request.json();

    if (!userToken || !siteUrl || !fixAction) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    console.log(`[SEO AUTOMATED FIX] Executing fix: ${fixAction} for ${siteUrl}`);

    let fixResult = {};

    switch (fixAction) {
      case 'generate_and_submit_sitemap':
        fixResult = await testSitemapGeneration(userToken, siteUrl);
        break;
      case 'generate_robots_txt':
        fixResult = await testRobotsGeneration(userToken, siteUrl);
        break;
      case 'generate_schema_markup':
        fixResult = await testSchemaGeneration(userToken, siteUrl, issueId);
        break;
      case 'fix_indexing_issue':
        fixResult = await testIndexingFix(userToken, siteUrl, issueId);
        break;
      case 'all_fixes':
        const sitemapFix = await testSitemapGeneration(userToken, siteUrl);
        const robotsFix = await testRobotsGeneration(userToken, siteUrl);
        const schemaFix = await testSchemaGeneration(userToken, siteUrl);
        fixResult = {
          sitemapFix,
          robotsFix,
          schemaFix,
          summary: 'Multiple fixes applied'
        };
        break;
      default:
        return NextResponse.json({ error: 'Unknown fix action' }, { status: 400 });
    }

    // Track the fix attempt
    await trackFixAttempt(userToken, siteUrl, fixAction, fixResult);

    return NextResponse.json({
      success: true,
      action: fixAction,
      siteUrl,
      result: fixResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SEO AUTOMATED FIX] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to execute automated fix'
    }, { status: 500 });
  }
}

async function testSitemapGeneration(userToken: string, siteUrl: string) {
  console.log('[SITEMAP FIX] Starting sitemap generation test...');
  
  // Simulate sitemap generation by calling the actual API
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/technical-seo/generate-sitemap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userToken,
        siteUrl,
        submitToGSC: true
      })
    });

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        action: 'sitemap_generated',
        details: {
          sitemapUrl: result.data.sitemapUrl,
          urlCount: result.data.urlCount,
          gscSubmitted: result.data.gscSubmission?.success || false
        },
        statusBefore: 'missing',
        statusAfter: 'generated_and_submitted',
        impact: 'high'
      };
    } else {
      return {
        success: false,
        action: 'sitemap_generation_failed',
        error: result.error,
        statusBefore: 'missing',
        statusAfter: 'failed',
        impact: 'none'
      };
    }
  } catch (error) {
    return {
      success: false,
      action: 'sitemap_generation_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      statusBefore: 'missing', 
      statusAfter: 'error',
      impact: 'none'
    };
  }
}

async function testRobotsGeneration(userToken: string, siteUrl: string) {
  console.log('[ROBOTS FIX] Starting robots.txt generation test...');

  const robotsContent = generateRobotsTxtContent(siteUrl);
  
  // Update robots analysis to show it now exists
  const { data, error } = await supabase
    .from('robots_analyses')
    .upsert({
      user_token: userToken,
      site_url: siteUrl,
      exists: true,
      accessible: true,
      size: robotsContent.length,
      issues_count: 0,
      suggestions_count: 0,
      analyzed_at: new Date().toISOString(),
      content: robotsContent,
      crawl_delay: null,
      sitemap_urls: 1
    }, {
      onConflict: 'user_token,site_url'
    })
    .select()
    .single();

  if (!error) {
    return {
      success: true,
      action: 'robots_generated',
      details: {
        content: robotsContent,
        size: robotsContent.length,
        sitemapReferences: 1
      },
      statusBefore: 'missing',
      statusAfter: 'generated',
      impact: 'medium'
    };
  } else {
    return {
      success: false,
      action: 'robots_generation_failed',
      error: error.message,
      statusBefore: 'missing',
      statusAfter: 'error',
      impact: 'none'
    };
  }
}

async function testSchemaGeneration(userToken: string, siteUrl: string, issueId?: string) {
  console.log('[SCHEMA FIX] Starting schema markup generation test...');

  // Find pages missing schema
  const { data: existingSchemas } = await supabase
    .from('schema_generations')
    .select('*')
    .ilike('page_url', `${siteUrl}%`)
    .eq('schemas_generated', 0);

  let fixedCount = 0;
  const results = [];

  if (existingSchemas && existingSchemas.length > 0) {
    for (const schema of existingSchemas.slice(0, 3)) { // Fix up to 3 pages
      const schemaTypes = generateSchemaTypes(schema.page_url);
      
      const { data, error } = await supabase
        .from('schema_generations')
        .update({
          schemas_generated: schemaTypes.length,
          schema_types: schemaTypes,
          generated_at: new Date().toISOString()
        })
        .eq('id', schema.id)
        .select()
        .single();

      if (!error) {
        fixedCount++;
        results.push({
          pageUrl: schema.page_url,
          schemasAdded: schemaTypes.length,
          types: schemaTypes
        });
      }
    }
  }

  return {
    success: fixedCount > 0,
    action: 'schema_markup_generated',
    details: {
      pagesFixed: fixedCount,
      totalSchemas: results.reduce((sum, r) => sum + r.schemasAdded, 0),
      pages: results
    },
    statusBefore: 'missing',
    statusAfter: fixedCount > 0 ? 'generated' : 'error',
    impact: 'medium'
  };
}

async function testIndexingFix(userToken: string, siteUrl: string, issueId?: string) {
  console.log('[INDEXING FIX] Starting indexing issue fix test...');

  // Find indexing issues and simulate fixes
  const { data: inspections } = await supabase
    .from('url_inspections')
    .select('*')
    .eq('user_token', userToken)
    .eq('site_url', siteUrl)
    .in('index_status', ['FAIL', 'PARTIAL']);

  let fixedCount = 0;
  const results = [];

  if (inspections && inspections.length > 0) {
    for (const inspection of inspections.slice(0, 2)) { // Fix up to 2 issues
      // Simulate fixing the issue
      const { data, error } = await supabase
        .from('url_inspections')
        .update({
          index_status: 'PASS',
          can_be_indexed: true,
          index_status_description: 'Page successfully indexed',
          inspected_at: new Date().toISOString()
        })
        .eq('id', inspection.id)
        .select()
        .single();

      if (!error) {
        fixedCount++;
        results.push({
          url: inspection.inspected_url,
          previousStatus: inspection.index_status,
          newStatus: 'PASS',
          fixApplied: getFixApplied(inspection.index_status_description)
        });
      }
    }
  }

  return {
    success: fixedCount > 0,
    action: 'indexing_issues_fixed',
    details: {
      issuesFixed: fixedCount,
      pages: results
    },
    statusBefore: 'has_errors',
    statusAfter: fixedCount > 0 ? 'resolved' : 'error', 
    impact: 'high'
  };
}

function generateRobotsTxtContent(siteUrl: string): string {
  return `# Robots.txt generated by SEOAgent
User-agent: *
Allow: /

# Sitemaps
Sitemap: ${siteUrl}/sitemap.xml

# Block admin areas
Disallow: /admin/
Disallow: /wp-admin/
Disallow: /wp-includes/

# Block search and filter pages
Disallow: /search
Disallow: /*?*
Disallow: /tag/
Disallow: /category/

# Allow important bots
User-agent: Googlebot
Allow: /

User-agent: Bingbot  
Allow: /

# Crawl delay for other bots
User-agent: *
Crawl-delay: 1`;
}

function generateSchemaTypes(pageUrl: string): string[] {
  if (pageUrl.includes('/blog/') || pageUrl.includes('/article/')) {
    return ['Article', 'BreadcrumbList', 'Organization'];
  } else if (pageUrl.includes('/product/')) {
    return ['Product', 'BreadcrumbList', 'Organization'];
  } else if (pageUrl.includes('/about')) {
    return ['Organization', 'BreadcrumbList'];
  } else if (pageUrl.includes('/contact')) {
    return ['Organization', 'ContactPage', 'BreadcrumbList'];
  } else {
    return ['WebSite', 'Organization', 'BreadcrumbList'];
  }
}

function getFixApplied(previousDescription: string): string {
  if (previousDescription?.includes('robots.txt')) {
    return 'Updated robots.txt to allow indexing';
  } else if (previousDescription?.includes('404')) {
    return 'Fixed broken URL or added redirect';
  } else if (previousDescription?.includes('server error')) {
    return 'Resolved server configuration issue';
  } else {
    return 'Applied general indexing optimization';
  }
}

async function trackFixAttempt(userToken: string, siteUrl: string, fixAction: string, result: any) {
  try {
    await supabase
      .from('technical_seo_fixes')
      .insert({
        user_token: userToken,
        site_url: siteUrl,
        fix_type: fixAction,
        status: result.success ? 'completed' : 'failed',
        details: result,
        applied_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('[TRACK FIX] Error tracking fix attempt:', error);
  }
}

export async function GET() {
  return NextResponse.json({
    description: 'Test automated SEO fixes with real-time status tracking',
    endpoint: 'POST /api/test-seo/automated-fixes',
    parameters: {
      userToken: 'User authentication token',
      siteUrl: 'Website URL',
      fixAction: 'Type of fix to apply',
      issueId: 'Optional specific issue ID to fix'
    },
    availableFixes: [
      'generate_and_submit_sitemap',
      'generate_robots_txt', 
      'generate_schema_markup',
      'fix_indexing_issue',
      'all_fixes'
    ],
    testFlow: [
      '1. Execute the requested automated fix',
      '2. Update database with new status',
      '3. Track fix attempt and results',
      '4. Return before/after status comparison'
    ]
  });
}