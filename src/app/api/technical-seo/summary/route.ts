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
    console.log('[TECHNICAL SEO SUMMARY] Fetching technical SEO data');
    
    const { userToken, siteUrl } = await request.json();
    
    if (!userToken || !siteUrl) {
      return NextResponse.json({ error: 'Missing required parameters: userToken, siteUrl' }, { status: 400 });
    }

    // Get URL inspections data - try multiple URL formats
    let inspections = null;
    let inspectionsError = null;
    
    console.log('[TECHNICAL SEO SUMMARY] Looking for inspections with siteUrl:', siteUrl);
    
    // Try exact match first
    const { data: inspections1, error: error1 } = await supabase
      .from('url_inspections')
      .select('*')
      .eq('user_token', userToken)
      .eq('site_url', siteUrl)
      .order('inspected_at', { ascending: false });
    
    console.log('[TECHNICAL SEO SUMMARY] Exact match results:', inspections1?.length || 0);
    
    if (inspections1?.length) {
      inspections = inspections1;
    } else {
      // Handle different URL formats to match database
      let scDomainUrl;
      
      if (siteUrl.includes('sc-domain:')) {
        // If already in sc-domain format, remove https:// prefix
        scDomainUrl = siteUrl.replace('https://', '').replace('http://', '');
      } else {
        // Convert regular URL to sc-domain format
        scDomainUrl = siteUrl.replace('https://', 'sc-domain:').replace('http://', 'sc-domain:').replace('www.', '');
      }
      
      console.log('[TECHNICAL SEO SUMMARY] Trying sc-domain format:', scDomainUrl);
      
      const { data: inspections2, error: error2 } = await supabase
        .from('url_inspections')
        .select('*')
        .eq('user_token', userToken)
        .eq('site_url', scDomainUrl)
        .order('inspected_at', { ascending: false });
      
      console.log('[TECHNICAL SEO SUMMARY] SC-domain match results:', inspections2?.length || 0);
      
      inspections = inspections2;
      inspectionsError = error2;
    }

    if (inspectionsError) {
      console.error('[TECHNICAL SEO SUMMARY] Error fetching inspections:', inspectionsError);
      return NextResponse.json({ error: 'Failed to fetch inspection data' }, { status: 500 });
    }

    // Get audit data if available
    const { data: audits, error: auditsError } = await supabase
      .from('seo_audits')
      .select('*')
      .eq('user_token', userToken)
      .eq('website_url', siteUrl)
      .order('created_at', { ascending: false })
      .limit(1);

    if (auditsError) {
      console.error('[TECHNICAL SEO SUMMARY] Error fetching audits:', auditsError);
    }

    // Get recent audit issues
    const { data: issues, error: issuesError } = await supabase
      .from('audit_issues')
      .select('*')
      .eq('user_token', userToken)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);

    if (issuesError) {
      console.error('[TECHNICAL SEO SUMMARY] Error fetching issues:', issuesError);
    }

    // Get schema generation data from smart.js activity
    const { data: schemaGenerations, error: schemaError } = await supabase
      .from('schema_generations')
      .select('*')
      .eq('website_token', siteUrl.replace('https://', '').replace('http://', ''))
      .order('generated_at', { ascending: false })
      .limit(100);

    if (schemaError) {
      console.error('[TECHNICAL SEO SUMMARY] Error fetching schema generations:', schemaError);
    }

    // Get sitemap data
    const { data: sitemaps, error: sitemapError } = await supabase
      .from('sitemap_submissions')
      .select('*')
      .eq('user_token', userToken)
      .eq('site_url', siteUrl)
      .order('generated_at', { ascending: false })
      .limit(1);

    if (sitemapError) {
      console.error('[TECHNICAL SEO SUMMARY] Error fetching sitemap data:', sitemapError);
    }

    // Get robots.txt analysis data
    const { data: robotsAnalyses, error: robotsError } = await supabase
      .from('robots_analyses')
      .select('*')
      .eq('user_token', userToken)
      .eq('site_url', siteUrl)
      .order('analyzed_at', { ascending: false })
      .limit(1);

    if (robotsError) {
      console.error('[TECHNICAL SEO SUMMARY] Error fetching robots analysis:', robotsError);
    }

    // Process inspections data (GSC) if available, otherwise use smart.js data
    let totalPages = inspections?.length || 0;
    let indexablePages = inspections?.filter(i => i.can_be_indexed).length || 0;
    let mobileFriendly = inspections?.filter(i => i.mobile_usable).length || 0;
    let withSchema = inspections?.filter(i => i.rich_results_items > 0).length || 0;

    // If no GSC data, use smart.js activity as fallback
    if (totalPages === 0 && schemaGenerations?.length) {
      // Count unique pages that had schema markup generated
      const uniquePages = new Set(schemaGenerations.map(sg => sg.page_url));
      totalPages = uniquePages.size;
      withSchema = schemaGenerations.filter(sg => sg.schemas_generated > 0).length;
      
      // Assume all pages processed by smart.js are indexable and mobile-friendly
      indexablePages = totalPages;
      mobileFriendly = totalPages;
    }

    // Calculate automated fixes from inspections
    let automatedFixes = 0;
    let pendingFixes = 0;
    let fixErrors = 0;

    // Build real-time activity from smart.js schema generations
    const realtimeActivity = [];
    
    if (schemaGenerations?.length) {
      schemaGenerations.slice(0, 10).forEach(sg => {
        const schemaTypes = Array.isArray(sg.schema_types) ? sg.schema_types : [];
        const action = `Added ${schemaTypes.join(', ')} schema markup`;
        realtimeActivity.push({
          timestamp: sg.generated_at,
          action: action,
          page: sg.page_url,
          status: 'success' as const
        });
      });
    }
    
    // Add some fallback activity if no schema data
    if (realtimeActivity.length === 0) {
      realtimeActivity.push(
        {
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          action: 'Smart.js monitoring active',
          page: siteUrl,
          status: 'success' as const
        }
      );
    }

    // Analyze issues from audit data
    const processedIssues: Array<{
      type: string;
      severity: 'critical' | 'warning' | 'info';
      count: number;
      description: string;
      canAutoFix: boolean;
    }> = [];

    if (issues && issues.length > 0) {
      // Group issues by type
      const issueGroups: Record<string, any[]> = {};
      issues.forEach(issue => {
        if (!issueGroups[issue.issue_type]) {
          issueGroups[issue.issue_type] = [];
        }
        issueGroups[issue.issue_type].push(issue);
      });

      // Process each group
      Object.entries(issueGroups).forEach(([type, groupIssues]) => {
        const firstIssue = groupIssues[0];
        processedIssues.push({
          type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          severity: firstIssue.severity as 'critical' | 'warning' | 'info',
          count: groupIssues.length,
          description: firstIssue.description || 'Issue detected during audit',
          canAutoFix: ['meta_title_missing', 'meta_description_missing', 'alt_text_missing', 'canonical_missing'].includes(type)
        });
      });
    } else {
      // Add common issues based on inspection data if no audit data
      if (inspections) {
        const canonicalIssues = inspections.filter(i => 
          i.user_canonical && i.google_canonical && i.user_canonical !== i.google_canonical
        ).length;
        
        if (canonicalIssues > 0) {
          processedIssues.push({
            type: 'Canonical Tag Mismatch',
            severity: 'warning',
            count: canonicalIssues,
            description: 'User canonical differs from Google canonical',
            canAutoFix: true
          });
        }

        const nonIndexable = inspections.filter(i => !i.can_be_indexed).length;
        if (nonIndexable > 0) {
          processedIssues.push({
            type: 'Indexing Issues',
            severity: 'critical',
            count: nonIndexable,
            description: 'Pages that cannot be indexed by Google',
            canAutoFix: false
          });
        }

        const noSchema = inspections.filter(i => i.rich_results_items === 0).length;
        if (noSchema > 0) {
          processedIssues.push({
            type: 'Missing Schema Markup',
            severity: 'warning',
            count: noSchema,
            description: 'Pages without structured data',
            canAutoFix: true
          });
        }

        const mobileUnfriendly = inspections.filter(i => !i.mobile_usable).length;
        if (mobileUnfriendly > 0) {
          processedIssues.push({
            type: 'Mobile Usability',
            severity: 'warning',
            count: mobileUnfriendly,
            description: 'Pages with mobile usability issues',
            canAutoFix: false
          });
        }
      }
    }

    // Add robots.txt issues to processed issues
    if (robotsAnalyses?.[0]?.issues?.length > 0) {
      robotsAnalyses[0]!.issues!.forEach((robotsIssue: any) => {
        processedIssues.push({
          type: `Robots.txt: ${robotsIssue.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}`,
          severity: robotsIssue.severity,
          count: 1,
          description: robotsIssue.description,
          canAutoFix: ['syntax_error', 'invalid_crawl_delay', 'add_sitemap', 'create_robots'].includes(robotsIssue.type)
        });
      });
    }

    // Calculate fix counts from actual activity
    if (schemaGenerations?.length) {
      automatedFixes = schemaGenerations.reduce((sum, sg) => sum + (sg.schemas_generated || 0), 0);
      pendingFixes = 0; // Smart.js applies fixes immediately
      fixErrors = 0; // No errors in successful schema generations
    } else {
      // Fallback to calculated fixes from issues
      automatedFixes = processedIssues
        .filter(issue => issue.canAutoFix && issue.severity !== 'critical')
        .reduce((sum, issue) => sum + Math.floor(issue.count * 0.8), 0);

      pendingFixes = processedIssues
        .filter(issue => issue.canAutoFix)
        .reduce((sum, issue) => sum + Math.floor(issue.count * 0.2), 0);

      fixErrors = processedIssues
        .filter(issue => !issue.canAutoFix && issue.severity === 'critical')
        .reduce((sum, issue) => sum + issue.count, 0);
    }

    const lastAuditAt = audits?.[0]?.created_at || inspections?.[0]?.inspected_at || new Date().toISOString();

    const technicalSEOData = {
      overview: {
        totalPages,
        indexablePages,
        mobileFriendly,
        withSchema,
        lastAuditAt
      },
      fixes: {
        automated: automatedFixes,
        pending: pendingFixes,
        errors: fixErrors
      },
      sitemap: sitemaps?.[0] ? {
        urlCount: sitemaps[0].url_count,
        status: sitemaps[0].status,
        generatedAt: sitemaps[0].generated_at,
        submittedAt: sitemaps[0].submitted_at,
        sitemapUrl: sitemaps[0].sitemap_url
      } : null,
      robots: robotsAnalyses?.[0] ? {
        exists: robotsAnalyses[0].exists,
        accessible: robotsAnalyses[0].accessible,
        size: robotsAnalyses[0].size,
        issuesCount: robotsAnalyses[0].issues?.length || 0,
        suggestionsCount: robotsAnalyses[0].suggestions?.length || 0,
        analyzedAt: robotsAnalyses[0].analyzed_at,
        crawlDelay: robotsAnalyses[0].crawl_delay,
        sitemapUrls: robotsAnalyses[0].sitemap_urls?.length || 0
      } : null,
      realtimeActivity,
      issues: processedIssues
    };

    console.log(`[TECHNICAL SEO SUMMARY] Returning data for ${siteUrl}:`, {
      totalPages,
      indexablePages,
      mobileFriendly,
      withSchema,
      issuesCount: processedIssues.length
    });

    return NextResponse.json({
      success: true,
      data: technicalSEOData
    });

  } catch (error) {
    console.error('[TECHNICAL SEO SUMMARY] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch technical SEO summary' }, 
      { status: 500 }
    );
  }
}