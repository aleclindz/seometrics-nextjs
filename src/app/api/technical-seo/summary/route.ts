import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UrlNormalizationService } from '@/lib/UrlNormalizationService';

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

    // Get URL inspections data - try multiple URL formats with error handling
    let inspections = null;
    let inspectionsError = null;
    
    console.log('[TECHNICAL SEO SUMMARY] === AUDIT DEBUG START ===');
    console.log('[TECHNICAL SEO SUMMARY] Input parameters:', { userToken, siteUrl });
    console.log('[TECHNICAL SEO SUMMARY] Looking for inspections with siteUrl:', siteUrl);
    
    try {
      // Generate all possible URL variants using the normalization service
      const urlVariations = UrlNormalizationService.generateUrlVariations(siteUrl);
      const urlVariants = [
        siteUrl,                           // Original request
        urlVariations.domainProperty,      // sc-domain:translateyoutubevideos.com
        urlVariations.httpsUrl,            // https://translateyoutubevideos.com  
        urlVariations.gscFormat,           // https://translateyoutubevideos.com
        siteUrl.replace('https://', '').replace('http://', '') // translateyoutubevideos.com
      ];

      console.log('[TECHNICAL SEO SUMMARY] Trying URL variants:', urlVariants);
      
      for (const variant of urlVariants) {
        const { data, error } = await supabase
          .from('url_inspections')
          .select('*')
          .eq('user_token', userToken)
          .eq('site_url', variant)
          .order('inspected_at', { ascending: false });
          
        console.log(`[TECHNICAL SEO SUMMARY] URL variant ${variant}: ${data?.length || 0} results`, error ? `(error: ${error.code})` : '');
          
        if (data && data.length > 0 && !error) {
          inspections = data;
          console.log('[TECHNICAL SEO SUMMARY] ✅ Found inspections with URL variant:', variant, `(${data.length} records)`);
          break;
        } else if (error && error.code !== 'PGRST116') {
          // PGRST116 is "not found", other errors are actual issues
          inspectionsError = error;
        }
      }

      if (inspectionsError && inspectionsError.code !== '42P01') {
        console.error('[TECHNICAL SEO SUMMARY] Error fetching inspections:', inspectionsError);
        return NextResponse.json({ error: 'Failed to fetch inspection data' }, { status: 500 });
      }
    } catch (error: any) {
      if (error?.code === '42P01') {
        console.log('[TECHNICAL SEO SUMMARY] ⚠️ url_inspections table not found, using fallback data');
      } else {
        console.error('[TECHNICAL SEO SUMMARY] ❌ Unexpected error fetching inspections:', error);
      }
    }
    
    console.log(`[TECHNICAL SEO SUMMARY] Final inspections result: ${inspections?.length || 0} records found`);
    if (inspections?.length) {
      console.log('[TECHNICAL SEO SUMMARY] Sample inspection:', {
        url: inspections[0].inspected_url,
        can_be_indexed: inspections[0].can_be_indexed,
        mobile_usable: inspections[0].mobile_usable,
        rich_results_items: inspections[0].rich_results_items,
        inspected_at: inspections[0].inspected_at
      });
    } else {
      console.log('[TECHNICAL SEO SUMMARY] 💡 To get URL inspection data:');
      console.log('[TECHNICAL SEO SUMMARY]   - Ask the agent: "Run URL inspections for my site"');
      console.log('[TECHNICAL SEO SUMMARY]   - Or wait for the weekly CRON job to run');
    }

    // Get recent agent activity data (replaces legacy audit data)
    console.log('[TECHNICAL SEO SUMMARY] Fetching recent agent activity...');
    let recentActivity = null;
    try {
      const result = await supabase
        .from('agent_events')
        .select('*')
        .eq('user_token', userToken)
        .or(`metadata->>'site_url'.eq.${siteUrl},metadata->>'site_url'.eq.${siteUrl.replace('https://', '').replace('http://', '')}`)
        .order('created_at', { ascending: false })
        .limit(50);
      
      recentActivity = result.data;
      console.log(`[TECHNICAL SEO SUMMARY] Agent activity query result:`, {
        found: result.data?.length || 0,
        error: result.error,
        sampleEvent: result.data?.[0]?.event_type || 'none'
      });
      
      if (result.error && result.error.code !== '42P01') {
        console.error('[TECHNICAL SEO SUMMARY] Error fetching agent activity:', result.error);
      }
    } catch (error: any) {
      console.error('[TECHNICAL SEO SUMMARY] Unexpected error fetching agent activity:', error);
    }

    // Get GSC performance data for insights
    console.log('[TECHNICAL SEO SUMMARY] Fetching GSC performance data for user:', userToken);
    let performanceData = null;
    try {
      const result = await supabase
        .from('gsc_performance_data')
        .select('*')
        .eq('user_token', userToken)
        .order('date_start', { ascending: false })
        .limit(30);
      
      performanceData = result.data;
      console.log(`[TECHNICAL SEO SUMMARY] GSC performance query result:`, {
        found: result.data?.length || 0,
        error: result.error,
        sampleData: result.data?.[0] || 'none'
      });
      
      if (result.error && result.error.code !== '42P01') {
        console.error('[TECHNICAL SEO SUMMARY] Error fetching GSC performance:', result.error);
      }
    } catch (error: any) {
      console.error('[TECHNICAL SEO SUMMARY] Unexpected error fetching GSC performance:', error);
    }

    // Get schema-related activity from agent events
    let schemaActivity = null;
    try {
      const result = await supabase
        .from('agent_events')
        .select('*')
        .eq('user_token', userToken)
        .in('event_type', ['schema_generated', 'meta_tags_updated', 'technical_fix_applied'])
        .or(`metadata->>'site_url'.eq.${siteUrl},metadata->>'site_url'.eq.${siteUrl.replace('https://', '').replace('http://', '')}`)
        .order('created_at', { ascending: false })
        .limit(100);
      
      schemaActivity = result.data;
      if (result.error && result.error.code !== '42P01') {
        console.error('[TECHNICAL SEO SUMMARY] Error fetching schema activity:', result.error);
      }
    } catch (error: any) {
      console.error('[TECHNICAL SEO SUMMARY] Unexpected error fetching schema activity:', error);
    }

    // Get sitemap-related activity from agent events
    let sitemapActivity = null;
    try {
      const result = await supabase
        .from('agent_events')
        .select('*')
        .eq('user_token', userToken)
        .in('event_type', ['sitemap_generated', 'sitemap_submitted', 'sitemap_updated'])
        .or(`metadata->>'site_url'.eq.${siteUrl},metadata->>'site_url'.eq.${siteUrl.replace('https://', '').replace('http://', '')}`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      sitemapActivity = result.data;
      if (result.error && result.error.code !== '42P01') {
        console.error('[TECHNICAL SEO SUMMARY] Error fetching sitemap activity:', result.error);
      }
    } catch (error: any) {
      console.error('[TECHNICAL SEO SUMMARY] Unexpected error fetching sitemap activity:', error);
    }

    // Get robots.txt related activity from agent events
    let robotsActivity = null;
    try {
      const result = await supabase
        .from('agent_events')
        .select('*')
        .eq('user_token', userToken)
        .in('event_type', ['robots_analyzed', 'robots_updated', 'robots_optimized'])
        .or(`metadata->>'site_url'.eq.${siteUrl},metadata->>'site_url'.eq.${siteUrl.replace('https://', '').replace('http://', '')}`)
        .order('created_at', { ascending: false })
        .limit(5);
      
      robotsActivity = result.data;
      if (result.error && result.error.code !== '42P01') {
        console.error('[TECHNICAL SEO SUMMARY] Error fetching robots activity:', result.error);
      }
    } catch (error: any) {
      console.error('[TECHNICAL SEO SUMMARY] Unexpected error fetching robots activity:', error);
    }

    // Process inspections data (GSC) if available, otherwise use smart.js data
    let totalPages = inspections?.length || 0;
    let indexablePages = inspections?.filter(i => i.can_be_indexed).length || 0;
    let mobileFriendly = inspections?.filter(i => i.mobile_usable).length || 0;
    let withSchema = inspections?.filter(i => i.rich_results_items > 0).length || 0;

    // Process GSC performance data for comprehensive insights
    let performanceInsights = null;
    if (performanceData?.length) {
      console.log('[TECHNICAL SEO SUMMARY] Processing GSC performance data for insights');
      
      // Aggregate all performance data
      let totalClicks = 0;
      let totalImpressions = 0;
      const allKeywords: any[] = [];
      const allPages: any[] = [];
      const allCountries: any[] = [];
      const allDevices: any[] = [];
      const uniquePages = new Set<string>();
      
      performanceData.forEach(perf => {
        totalClicks += perf.total_clicks || 0;
        totalImpressions += perf.total_impressions || 0;
        
        // Process queries/keywords
        if (perf.queries && Array.isArray(perf.queries)) {
          allKeywords.push(...perf.queries);
        }
        
        // Process pages
        if (perf.pages && Array.isArray(perf.pages)) {
          allPages.push(...perf.pages);
          perf.pages.forEach((pageData: any) => {
            if (pageData.page) {
              uniquePages.add(pageData.page);
            }
          });
        }
        
        // Process countries
        if (perf.countries && Array.isArray(perf.countries)) {
          allCountries.push(...perf.countries);
        }
        
        // Process devices
        if (perf.devices && Array.isArray(perf.devices)) {
          allDevices.push(...perf.devices);
        }
      });
      
      // Sort keywords by clicks
      const topKeywords = allKeywords
        .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
        .slice(0, 10);
      
      // Sort pages by clicks
      const topPages = allPages
        .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
        .slice(0, 10);
      
      // Calculate average CTR and position
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
      const avgPosition = performanceData.reduce((sum, perf) => sum + (parseFloat(perf.avg_position) || 0), 0) / performanceData.length;
      
      performanceInsights = {
        totalClicks,
        totalImpressions,
        avgCtr: parseFloat(avgCtr.toFixed(2)),
        avgPosition: parseFloat(avgPosition.toFixed(1)),
        topKeywords,
        topPages,
        countries: allCountries,
        devices: allDevices,
        uniquePagesCount: uniquePages.size,
        dataRangeStart: performanceData[0]?.date_start,
        dataRangeEnd: performanceData[0]?.date_end
      };
      
      console.log(`[TECHNICAL SEO SUMMARY] Performance insights:`, {
        totalClicks,
        totalImpressions,
        avgCtr,
        topKeywordsCount: topKeywords.length,
        uniquePagesCount: uniquePages.size
      });
      
      // Use performance data for page count if no inspections
      if (totalPages === 0) {
        totalPages = uniquePages.size;
        console.log(`[TECHNICAL SEO SUMMARY] Using ${totalPages} pages from GSC performance data`);
        
        // Estimate indexable and mobile-friendly (assume good performance = indexed)
        indexablePages = totalPages;
        mobileFriendly = totalPages;
      }
    }
    
    // If still no data, use agent activity as final fallback
    if (totalPages === 0 && schemaActivity?.length) {
      console.log('[TECHNICAL SEO SUMMARY] Using agent activity as final fallback for page count');
      
      // Count unique pages from schema activity
      const uniquePages = new Set(
        schemaActivity
          .filter(activity => activity.metadata?.page_url || activity.metadata?.url)
          .map(activity => activity.metadata?.page_url || activity.metadata?.url)
      );
      totalPages = uniquePages.size;
      withSchema = schemaActivity.filter(activity => 
        activity.event_type === 'schema_generated' || 
        (activity.metadata?.schemas_added && activity.metadata.schemas_added > 0)
      ).length;
      
      console.log(`[TECHNICAL SEO SUMMARY] Found ${totalPages} unique pages from agent activity`);
      
      // Assume all pages processed by agent are indexable and mobile-friendly
      indexablePages = totalPages;
      mobileFriendly = totalPages;
    }

    // Calculate automated fixes from inspections
    let automatedFixes = 0;
    let pendingFixes = 0;
    let fixErrors = 0;

    // Build real-time activity from agent events
    const realtimeActivity = [];
    
    if (recentActivity?.length) {
      recentActivity.slice(0, 10).forEach(event => {
        let action = 'Agent activity';
        
        switch (event.event_type) {
          case 'schema_generated':
            const schemaTypes = event.metadata?.schema_types || ['Schema markup'];
            action = `Added ${Array.isArray(schemaTypes) ? schemaTypes.join(', ') : schemaTypes}`;
            break;
          case 'meta_tags_updated':
            action = 'Updated meta tags';
            break;
          case 'technical_fix_applied':
            action = event.metadata?.fix_description || 'Applied technical SEO fix';
            break;
          case 'sitemap_generated':
            action = 'Generated sitemap';
            break;
          case 'robots_optimized':
            action = 'Optimized robots.txt';
            break;
          default:
            action = event.event_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        }
        
        realtimeActivity.push({
          timestamp: event.created_at,
          action: action,
          page: event.metadata?.page_url || event.metadata?.url || siteUrl,
          status: (event.new_state === 'failed' || event.event_type.includes('error')) ? 'failed' : 'success'
        });
      });
    }
    
    // Add fallback activity if no recent events
    if (realtimeActivity.length === 0) {
      realtimeActivity.push(
        {
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          action: 'SEOAgent monitoring active',
          page: siteUrl,
          status: 'success' as const
        }
      );
    }

    // Analyze issues from inspection data and agent events
    const processedIssues: Array<{
      type: string;
      severity: 'critical' | 'warning' | 'info';
      count: number;
      description: string;
      canAutoFix: boolean;
    }> = [];

    // Check for issues from recent agent events (errors, failures)
    if (recentActivity?.length) {
      const failedEvents = recentActivity.filter(event => 
        event.new_state === 'failed' || 
        event.event_type.includes('error') ||
        event.event_type.includes('issue')
      );
      
      if (failedEvents.length > 0) {
        const errorGroups: Record<string, any[]> = {};
        failedEvents.forEach(event => {
          const errorType = event.event_type.replace(/_/g, ' ');
          if (!errorGroups[errorType]) {
            errorGroups[errorType] = [];
          }
          errorGroups[errorType].push(event);
        });
        
        Object.entries(errorGroups).forEach(([type, events]) => {
          processedIssues.push({
            type: type.replace(/\b\w/g, l => l.toUpperCase()),
            severity: 'warning',
            count: events.length,
            description: events[0].metadata?.error_description || `${type} detected`,
            canAutoFix: ['meta tags', 'schema generation', 'sitemap'].some(fixable => type.includes(fixable))
          });
        });
      }
    }
    
    // Process inspection data for technical issues
    if (!processedIssues.length && inspections) {
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

    // Add robots.txt issues from agent activity
    if (robotsActivity?.length) {
      const robotsIssues = robotsActivity.filter(event => 
        event.event_type.includes('error') || 
        event.metadata?.issues_found
      );
      
      robotsIssues.forEach((robotsEvent: any) => {
        const issues = robotsEvent.metadata?.issues_found || [{
          type: 'robots_issue',
          description: 'Robots.txt issue detected',
          severity: 'warning'
        }];
        
        issues.forEach((issue: any) => {
          processedIssues.push({
            type: `Robots.txt: ${issue.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}`,
            severity: issue.severity || 'warning',
            count: 1,
            description: issue.description || 'Robots.txt issue detected',
            canAutoFix: ['syntax_error', 'invalid_crawl_delay', 'add_sitemap', 'create_robots'].includes(issue.type)
          });
        });
      });
    }

    // Calculate fix counts from agent activity
    if (recentActivity?.length) {
      automatedFixes = recentActivity.filter(event => 
        ['schema_generated', 'meta_tags_updated', 'technical_fix_applied', 'sitemap_generated'].includes(event.event_type) &&
        event.new_state !== 'failed'
      ).length;
      
      pendingFixes = recentActivity.filter(event => 
        event.new_state === 'pending' || event.new_state === 'in_progress'
      ).length;
      
      fixErrors = recentActivity.filter(event => 
        event.new_state === 'failed' || event.event_type.includes('error')
      ).length;
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

    const lastAuditAt = recentActivity?.[0]?.created_at || inspections?.[0]?.inspected_at || new Date().toISOString();

    const technicalSEOData = {
      overview: {
        totalPages,
        indexablePages,
        mobileFriendly,
        withSchema,
        lastAuditAt
      },
      performance: performanceInsights,
      fixes: {
        automated: automatedFixes,
        pending: pendingFixes,
        errors: fixErrors
      },
      sitemap: sitemapActivity?.[0] ? {
        status: sitemapActivity[0].new_state || 'completed',
        createdAt: sitemapActivity[0].created_at,
        submittedAt: sitemapActivity[0].created_at,
        sitemapUrl: sitemapActivity[0].metadata?.sitemap_url || null,
        warnings: sitemapActivity[0].metadata?.warnings || [],
        errors: sitemapActivity[0].metadata?.errors || []
      } : null,
      robots: robotsActivity?.[0] ? {
        exists: robotsActivity[0].metadata?.exists !== false,
        accessible: robotsActivity[0].metadata?.accessible !== false,
        size: robotsActivity[0].metadata?.size || 0,
        issuesCount: robotsActivity[0].metadata?.issues_found?.length || 0,
        suggestionsCount: robotsActivity[0].metadata?.suggestions?.length || 0,
        analyzedAt: robotsActivity[0].created_at,
        crawlDelay: robotsActivity[0].metadata?.crawl_delay || null,
        sitemapUrls: robotsActivity[0].metadata?.sitemap_urls?.length || 0
      } : null,
      realtimeActivity,
      issues: processedIssues
    };

    console.log('[TECHNICAL SEO SUMMARY] === AUDIT PROCESSING COMPLETE ===');
    console.log(`[TECHNICAL SEO SUMMARY] Final data summary for ${siteUrl}:`, {
      totalPages,
      indexablePages,
      mobileFriendly,
      withSchema,
      issuesCount: processedIssues.length,
      hasInspections: !!inspections?.length,
      hasPerformanceData: !!performanceData?.length,
      hasRecentActivity: !!recentActivity?.length,
      hasSchemaActivity: !!schemaActivity?.length
    });
    console.log('[TECHNICAL SEO SUMMARY] Performance data sample:', performanceData?.[0] || 'none');
    console.log('[TECHNICAL SEO SUMMARY] Recent activity sample:', recentActivity?.[0] || 'none');
    console.log('[TECHNICAL SEO SUMMARY] === AUDIT DEBUG END ===');

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