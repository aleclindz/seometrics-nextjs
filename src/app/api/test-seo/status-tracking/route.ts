import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const siteUrl = searchParams.get('siteUrl');

    if (!userToken || !siteUrl) {
      return NextResponse.json({ error: 'Missing userToken or siteUrl' }, { status: 400 });
    }

    console.log(`[SEO STATUS TRACKING] Fetching status for: ${siteUrl}`);

    // Get comprehensive technical SEO status
    const statusReport = await generateStatusReport(userToken, siteUrl);

    return NextResponse.json({
      success: true,
      siteUrl,
      lastUpdated: new Date().toISOString(),
      ...statusReport
    });

  } catch (error) {
    console.error('[SEO STATUS TRACKING] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch status tracking data'
    }, { status: 500 });
  }
}

async function generateStatusReport(userToken: string, siteUrl: string) {
  // Fetch all technical SEO data
  const [
    urlInspections,
    sitemapData, 
    robotsData,
    schemaData,
    fixHistory
  ] = await Promise.all([
    fetchUrlInspections(userToken, siteUrl),
    fetchSitemapStatus(userToken, siteUrl),
    fetchRobotsStatus(userToken, siteUrl),
    fetchSchemaStatus(userToken, siteUrl),
    fetchFixHistory(userToken, siteUrl)
  ]);

  // Calculate overall health score
  const healthMetrics = calculateHealthScore(urlInspections, sitemapData, robotsData, schemaData);

  // Generate issue summary
  const issueSummary = generateIssueSummary(urlInspections, sitemapData, robotsData, schemaData);

  // Track changes over time
  const changeTracking = trackChangesOverTime(fixHistory);

  return {
    overallHealth: healthMetrics,
    indexingStatus: {
      totalPages: urlInspections.total,
      indexablePages: urlInspections.indexable,
      blockedPages: urlInspections.blocked,
      errorPages: urlInspections.errors,
      issues: urlInspections.issues
    },
    sitemapStatus: {
      exists: sitemapData.exists,
      submitted: sitemapData.submitted,
      urlCount: sitemapData.urlCount,
      lastGenerated: sitemapData.lastGenerated,
      gscStatus: sitemapData.gscStatus
    },
    robotsStatus: {
      exists: robotsData.exists,
      accessible: robotsData.accessible,
      issues: robotsData.issues,
      lastAnalyzed: robotsData.lastAnalyzed
    },
    schemaStatus: {
      totalPages: schemaData.totalPages,
      pagesWithSchema: schemaData.withSchema,
      averageSchemas: schemaData.avgSchemas,
      missingPages: schemaData.missing
    },
    issueSummary,
    recentFixes: changeTracking.recentFixes,
    trendAnalysis: changeTracking.trends,
    recommendedActions: generateRecommendations(issueSummary)
  };
}

async function fetchUrlInspections(userToken: string, siteUrl: string) {
  const { data: inspections } = await supabase
    .from('url_inspections')
    .select('*')
    .eq('user_token', userToken)
    .eq('site_url', siteUrl)
    .order('inspected_at', { ascending: false });

  const total = inspections?.length || 0;
  const indexable = inspections?.filter(i => i.can_be_indexed).length || 0;
  const blocked = inspections?.filter(i => i.index_status === 'FAIL').length || 0;
  const errors = inspections?.filter(i => i.index_status === 'PARTIAL').length || 0;

  const issues = inspections?.filter(i => 
    i.index_status === 'FAIL' || 
    i.index_status === 'PARTIAL' || 
    !i.mobile_friendly
  ).map(i => ({
    url: i.inspected_url,
    type: !i.can_be_indexed ? 'indexing' : 'mobile',
    severity: i.index_status === 'FAIL' ? 'high' : 'medium',
    description: i.index_status_description || 'Mobile usability issue',
    lastChecked: i.inspected_at
  })) || [];

  return { total, indexable, blocked, errors, issues, raw: inspections };
}

async function fetchSitemapStatus(userToken: string, siteUrl: string) {
  const { data: sitemap } = await supabase
    .from('sitemap_submissions')
    .select('*')
    .eq('user_token', userToken)
    .eq('site_url', siteUrl)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    exists: !!sitemap,
    submitted: sitemap?.status === 'submitted' || sitemap?.status === 'processed',
    urlCount: 0, // This field doesn't exist in our schema
    lastGenerated: sitemap?.created_at,
    gscStatus: sitemap?.status || 'not_submitted'
  };
}

async function fetchRobotsStatus(userToken: string, siteUrl: string) {
  const { data: robots } = await supabase
    .from('robots_analyses')
    .select('*')
    .eq('user_token', userToken)
    .eq('site_url', siteUrl)
    .single();

  return {
    exists: robots?.exists || false,
    accessible: robots?.accessible || false,
    issues: robots?.issues_count || 0,
    lastAnalyzed: robots?.analyzed_at
  };
}

async function fetchSchemaStatus(userToken: string, siteUrl: string) {
  const { data: schemas } = await supabase
    .from('schema_generations')
    .select('*')
    .ilike('page_url', `${siteUrl}%`)
    .order('generated_at', { ascending: false });

  const totalPages = schemas?.length || 0;
  const withSchema = schemas?.filter(s => s.schemas_generated > 0).length || 0;
  const avgSchemas = totalPages > 0 ? 
    (schemas?.reduce((sum, s) => sum + (s.schemas_generated || 0), 0) || 0) / totalPages : 0;
  
  const missing = schemas?.filter(s => s.schemas_generated === 0).map(s => ({
    url: s.page_url,
    lastChecked: s.generated_at
  })) || [];

  return {
    totalPages,
    withSchema, 
    avgSchemas: Math.round(avgSchemas * 10) / 10,
    missing
  };
}

async function fetchFixHistory(userToken: string, siteUrl: string) {
  const { data: fixes } = await supabase
    .from('technical_seo_fixes')
    .select('*')
    .eq('user_token', userToken)
    .eq('site_url', siteUrl)
    .order('applied_at', { ascending: false })
    .limit(20);

  return fixes || [];
}

function calculateHealthScore(indexing: any, sitemap: any, robots: any, schema: any) {
  let score = 100;
  let issues = [];

  // Indexing health (40% weight)
  if (indexing.total > 0) {
    const indexingRate = indexing.indexable / indexing.total;
    if (indexingRate < 0.9) {
      score -= (1 - indexingRate) * 40;
      issues.push('indexing_problems');
    }
  }

  // Sitemap health (25% weight)
  if (!sitemap.exists || !sitemap.submitted) {
    score -= 25;
    issues.push('sitemap_missing');
  }

  // Robots.txt health (15% weight)
  if (!robots.exists) {
    score -= 15;
    issues.push('robots_missing');
  } else if (robots.issues > 0) {
    score -= robots.issues * 3;
    issues.push('robots_issues');
  }

  // Schema markup health (20% weight)
  if (schema.totalPages > 0) {
    const schemaRate = schema.withSchema / schema.totalPages;
    if (schemaRate < 0.8) {
      score -= (1 - schemaRate) * 20;
      issues.push('schema_missing');
    }
  }

  return {
    score: Math.max(0, Math.round(score)),
    grade: getGrade(score),
    issues,
    breakdown: {
      indexing: indexing.total > 0 ? Math.round((indexing.indexable / indexing.total) * 100) : 100,
      sitemap: sitemap.exists && sitemap.submitted ? 100 : 0,
      robots: robots.exists && robots.issues === 0 ? 100 : (robots.exists ? 70 : 0),
      schema: schema.totalPages > 0 ? Math.round((schema.withSchema / schema.totalPages) * 100) : 100
    }
  };
}

function generateIssueSummary(indexing: any, sitemap: any, robots: any, schema: any) {
  const issues = [];

  // Critical issues
  if (!sitemap.exists || !sitemap.submitted) {
    issues.push({
      type: 'critical',
      category: 'sitemap',
      title: 'Missing XML Sitemap',
      description: 'Website lacks proper sitemap submission to Google Search Console',
      impact: 'high',
      fixable: true
    });
  }

  if (indexing.blocked > 0) {
    issues.push({
      type: 'critical', 
      category: 'indexing',
      title: `${indexing.blocked} Pages Cannot Be Indexed`,
      description: 'Pages are blocked from search engine indexing',
      impact: 'high',
      fixable: true
    });
  }

  // Warning issues
  if (!robots.exists) {
    issues.push({
      type: 'warning',
      category: 'robots',
      title: 'Missing robots.txt File',
      description: 'No robots.txt file found or accessible',
      impact: 'medium',
      fixable: true
    });
  }

  if (schema.missing.length > 0) {
    issues.push({
      type: 'warning',
      category: 'schema',
      title: `${schema.missing.length} Pages Missing Schema Markup`,
      description: 'Pages lack structured data for better search visibility',
      impact: 'medium',
      fixable: true
    });
  }

  return {
    critical: issues.filter(i => i.type === 'critical').length,
    warnings: issues.filter(i => i.type === 'warning').length,
    total: issues.length,
    details: issues
  };
}

function trackChangesOverTime(fixHistory: any[]) {
  const recentFixes = fixHistory.slice(0, 5).map(fix => ({
    type: fix.fix_type,
    status: fix.status,
    appliedAt: fix.applied_at,
    impact: fix.details?.impact || 'unknown'
  }));

  const last24h = fixHistory.filter(fix => 
    new Date(fix.applied_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  return {
    recentFixes,
    trends: {
      fixesLast24h: last24h.length,
      successRate: fixHistory.length > 0 ? 
        (fixHistory.filter(f => f.status === 'completed').length / fixHistory.length) * 100 : 0
    }
  };
}

function generateRecommendations(issueSummary: any): any[] {
  const recommendations: any[] = [];

  issueSummary.details.forEach((issue: any) => {
    if (issue.fixable) {
      let action = '';
      switch (issue.category) {
        case 'sitemap':
          action = 'generate_and_submit_sitemap';
          break;
        case 'robots':
          action = 'generate_robots_txt';
          break;
        case 'schema':
          action = 'generate_schema_markup';
          break;
        case 'indexing':
          action = 'fix_indexing_issue';
          break;
      }
      
      if (action) {
        recommendations.push({
          priority: issue.impact === 'high' ? 1 : 2,
          action,
          title: `Fix ${issue.title}`,
          description: issue.description,
          estimatedImpact: issue.impact
        });
      }
    }
  });

  return recommendations.sort((a, b) => a.priority - b.priority);
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}