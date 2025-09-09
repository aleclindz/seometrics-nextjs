import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Enhanced Performance Dashboard API v2
 * Leverages new gsc_search_analytics dimensional table for true GSC dashboard recreation
 * Provides data for AI agent reasoning and analysis
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const domain = searchParams.get('domain');
    const days = parseInt(searchParams.get('days') || '28');
    const compareWith = searchParams.get('compareWith'); // 'previous' or specific date range

    if (!userToken || !domain) {
      return NextResponse.json({ error: 'User token and domain required' }, { status: 400 });
    }

    console.log('[PERFORMANCE V2] Fetching enhanced GSC analytics for:', { domain, days });

    // Calculate date ranges
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday (most recent complete data)
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);
    
    const endDateStr = endDate.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];

    // For comparison period
    const compareEndDate = new Date(startDate);
    compareEndDate.setDate(compareEndDate.getDate() - 1);
    const compareStartDate = new Date(compareEndDate);
    compareStartDate.setDate(compareStartDate.getDate() - days + 1);
    
    const compareEndDateStr = compareEndDate.toISOString().split('T')[0];
    const compareStartDateStr = compareStartDate.toISOString().split('T')[0];

    // Clean domain for GSC property lookup
    const cleanDomain = domain.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    const siteVariants = [
      domain,
      `sc-domain:${domain}`,
      `sc-domain:${cleanDomain}`,
      cleanDomain,
      `https://${cleanDomain}`,
      `https://www.${cleanDomain.replace(/^www\./, '')}`
    ];

    // 1. DAILY TIME SERIES DATA (for charts)
    const dailyMetricsQuery = supabase
      .from('gsc_search_analytics')
      .select('date, clicks, impressions, ctr, position')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .not('date', 'is', null)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .is('query', null) // Daily totals (no query dimension)
      .is('page', null)  // Daily totals (no page dimension)
      .order('date', { ascending: true });

    // 2. COMPARISON PERIOD DAILY DATA (for trend calculation)
    const dailyComparisonQuery = compareWith === 'previous' ? supabase
      .from('gsc_search_analytics')
      .select('date, clicks, impressions, ctr, position')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .not('date', 'is', null)
      .gte('date', compareStartDateStr)
      .lte('date', compareEndDateStr)
      .is('query', null)
      .is('page', null)
      .order('date', { ascending: true }) : Promise.resolve({ data: null, error: null });

    // 3. TOP QUERIES (aggregated rows for the exact range)
    const topQueriesQuery = supabase
      .from('gsc_search_analytics')
      .select('query, clicks, impressions, ctr, position')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .is('date', null) // Aggregated rows
      .eq('start_date', startDateStr)
      .eq('end_date', endDateStr)
      .not('query', 'is', null)
      .is('page', null) // Query-only data
      .order('impressions', { ascending: false })
      .limit(20);

    // 4. TOP PAGES (aggregated rows for the exact range)
    const topPagesQuery = supabase
      .from('gsc_search_analytics')
      .select('page, clicks, impressions, ctr, position')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .is('date', null)
      .eq('start_date', startDateStr)
      .eq('end_date', endDateStr)
      .not('page', 'is', null)
      .is('query', null)
      .order('clicks', { ascending: false })
      .limit(20);

    // 6. DEVICE BREAKDOWN
    const deviceBreakdownQuery = supabase
      .from('gsc_search_analytics')
      .select('device, clicks, impressions, ctr, position')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .is('date', null)
      .eq('start_date', startDateStr)
      .eq('end_date', endDateStr)
      .not('device', 'is', null)
      .is('query', null)
      .is('page', null)
      ;

    // 7. COUNTRY BREAKDOWN (top 10)
    const countryBreakdownQuery = supabase
      .from('gsc_search_analytics')
      .select('country, clicks, impressions, ctr, position')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .is('date', null)
      .eq('start_date', startDateStr)
      .eq('end_date', endDateStr)
      .not('country', 'is', null)
      .is('query', null)
      .is('page', null)
      .order('clicks', { ascending: false })
      .limit(10);

    // 8. SEARCH APPEARANCE DATA (Rich Results)
    const appearanceBreakdownQuery = supabase
      .from('gsc_search_analytics')
      .select('appearance, clicks, impressions, ctr, position')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .is('date', null)
      .eq('start_date', startDateStr)
      .eq('end_date', endDateStr)
      .not('appearance', 'is', null)
      .is('query', null)
      .is('page', null)
      .order('impressions', { ascending: false });

    // Execute all queries in parallel
    const [
      dailyMetricsResult,
      // currentTotals calculated from dailyMetrics
      dailyComparisonResult,
      topQueriesResult,
      topPagesResult,
      deviceBreakdownResult,
      countryBreakdownResult,
      appearanceBreakdownResult
    ] = await Promise.all([
      dailyMetricsQuery,
      dailyComparisonQuery,
      topQueriesQuery,
      topPagesQuery,
      deviceBreakdownQuery,
      countryBreakdownQuery,
      appearanceBreakdownQuery
    ]);

    // Check for errors
    const errors = [
      dailyMetricsResult.error,
      dailyComparisonResult && (dailyComparisonResult as any).error,
      topQueriesResult.error,
      topPagesResult.error,
      deviceBreakdownResult.error,
      countryBreakdownResult.error,
      appearanceBreakdownResult.error
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error('[PERFORMANCE V2] Database errors:', errors);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    // Process daily metrics for time series
    const dailyMetrics = dailyMetricsResult.data || [];
    const dailyTimeSeries = dailyMetrics.map(day => ({
      date: day.date,
      clicks: day.clicks || 0,
      impressions: day.impressions || 0,
      ctr: (day.ctr || 0) * 100, // Convert to percentage
      position: day.position || 0
    }));

    // Calculate current period totals from daily series
    const currentTotals = dailyTimeSeries.reduce((acc, d) => ({
      clicks: acc.clicks + (d.clicks || 0),
      impressions: acc.impressions + (d.impressions || 0),
      ctr: acc.ctr + ((d.ctr || 0) / 100) * (d.impressions || 0), // weighted CTR approximation
      position: acc.position + (d.position || 0)
    }), { clicks: 0, impressions: 0, ctr: 0, position: 0 });
    // Average position over days
    if (dailyTimeSeries.length > 0) {
      currentTotals.position = currentTotals.position / dailyTimeSeries.length;
      currentTotals.ctr = currentTotals.impressions > 0 ? (currentTotals.clicks / currentTotals.impressions) : 0;
    }

    // Calculate trends vs comparison period using previous period daily data
    const comparisonDaily = (dailyComparisonResult as any)?.data || [];
    const comparisonTotals = (comparisonDaily as any[]).reduce((acc, d: any) => ({
      clicks: acc.clicks + (d.clicks || 0),
      impressions: acc.impressions + (d.impressions || 0),
      ctr: acc.ctr + (d.ctr || 0),
      position: acc.position + (d.position || 0)
    }), { clicks: 0, impressions: 0, ctr: 0, position: 0 });
    if ((comparisonDaily as any[]).length > 0) {
      comparisonTotals.position = comparisonTotals.position / (comparisonDaily as any[]).length;
      comparisonTotals.ctr = comparisonTotals.impressions > 0 ? (comparisonTotals.clicks / comparisonTotals.impressions) : 0;
    } else if (!compareWith) {
      // No comparison requested
    }
    const trends = comparisonTotals ? {
      clicks: calculateTrend(currentTotals.clicks, comparisonTotals.clicks),
      impressions: calculateTrend(currentTotals.impressions, comparisonTotals.impressions),
      ctr: calculateTrend(currentTotals.ctr, comparisonTotals.ctr),
      position: calculateTrend(currentTotals.position, comparisonTotals.position, true) // Lower position is better
    } : null;

    // Fallback: if aggregated top queries/pages are empty for exact range, use most recent aggregated rows
    let topQueriesData = topQueriesResult.data || [] as any[];
    if (!topQueriesData || topQueriesData.length === 0) {
      const fallback = await supabase
        .from('gsc_search_analytics')
        .select('query, clicks, impressions, ctr, position, ingested_at')
        .eq('user_token', userToken)
        .in('site_url', siteVariants)
        .is('date', null)
        .not('query', 'is', null)
        .is('page', null)
        .order('ingested_at', { ascending: false })
        .limit(20);
      if (!fallback.error && fallback.data) topQueriesData = fallback.data;
    }

    let topPagesData = topPagesResult.data || [] as any[];
    if (!topPagesData || topPagesData.length === 0) {
      const fallback = await supabase
        .from('gsc_search_analytics')
        .select('page, clicks, impressions, ctr, position, ingested_at')
        .eq('user_token', userToken)
        .in('site_url', siteVariants)
        .is('date', null)
        .not('page', 'is', null)
        .is('query', null)
        .order('ingested_at', { ascending: false })
        .limit(20);
      if (!fallback.error && fallback.data) topPagesData = fallback.data;
    }

    // Format response data
    const performanceData = {
      // Overview metrics
      totals: {
        clicks: currentTotals.clicks || 0,
        impressions: currentTotals.impressions || 0,
        ctr: ((currentTotals.ctr || 0) * 100).toFixed(2),
        position: (currentTotals.position || 0).toFixed(1)
      },
      
      // Trend data (if comparison enabled)
      trends,
      
      // Time series for charts
      dailyMetrics: dailyTimeSeries,
      
      // Top performing content
      topQueries: (topQueriesData || []).slice(0, 10).map((q: any) => ({
        query: q.query,
        clicks: q.clicks || 0,
        impressions: q.impressions || 0,
        ctr: ((q.ctr || 0) * 100).toFixed(2),
        position: (q.position || 0).toFixed(1)
      })),
      
      topPages: (topPagesData || []).slice(0, 10).map((p: any) => ({
        page: p.page,
        clicks: p.clicks || 0,
        impressions: p.impressions || 0,
        ctr: ((p.ctr || 0) * 100).toFixed(2),
        position: (p.position || 0).toFixed(1)
      })),
      
      // Audience breakdowns
      deviceBreakdown: (deviceBreakdownResult.data || []).map(d => ({
        device: d.device,
        clicks: d.clicks || 0,
        impressions: d.impressions || 0,
        ctr: ((d.ctr || 0) * 100).toFixed(2),
        share: '0' // Will calculate after as string
      })),
      
      countryBreakdown: (countryBreakdownResult.data || []).map(c => ({
        country: c.country,
        clicks: c.clicks || 0,
        impressions: c.impressions || 0,
        ctr: ((c.ctr || 0) * 100).toFixed(2)
      })),
      
      // Rich results data
      searchAppearances: (appearanceBreakdownResult.data || []).map(a => ({
        type: a.appearance,
        clicks: a.clicks || 0,
        impressions: a.impressions || 0,
        ctr: ((a.ctr || 0) * 100).toFixed(2)
      })),
      
      // Meta information
      dateRange: { startDate: startDateStr, endDate: endDateStr },
      comparisonPeriod: compareWith === 'previous' ? { startDate: compareStartDateStr, endDate: compareEndDateStr } : null,
      hasData: dailyMetrics.length > 0 || (topQueriesResult.data && topQueriesResult.data.length > 0),
      dataPoints: dailyMetrics.length,
      lastUpdated: new Date().toISOString()
    };

    // Calculate device share percentages
    const totalDeviceClicks = performanceData.deviceBreakdown.reduce((sum, d) => sum + d.clicks, 0);
    if (totalDeviceClicks > 0) {
      performanceData.deviceBreakdown = performanceData.deviceBreakdown.map(d => ({
        ...d,
        share: ((d.clicks / totalDeviceClicks) * 100).toFixed(1)
      }));
    }

    // Log successful response
    console.log('[PERFORMANCE V2] Successfully fetched GSC analytics:', {
      hasData: performanceData.hasData,
      dailyPoints: performanceData.dailyMetrics.length,
      topQueries: performanceData.topQueries.length,
      topPages: performanceData.topPages.length,
      totalClicks: performanceData.totals.clicks,
      totalImpressions: performanceData.totals.impressions
    });

    return NextResponse.json({
      success: true,
      data: performanceData
    });

  } catch (error: any) {
    console.error('[PERFORMANCE V2] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate percentage change with proper handling of edge cases
 */
function calculateTrend(current: number, previous: number, lowerIsBetter = false): {
  value: number;
  percentage: string;
  direction: 'up' | 'down' | 'neutral';
} {
  if (!previous || previous === 0) {
    return {
      value: current,
      percentage: current > 0 ? '+∞' : '0%',
      direction: current > 0 ? 'up' : 'neutral'
    };
  }

  const change = ((current - previous) / previous) * 100;
  const direction = change > 0 ? (lowerIsBetter ? 'down' : 'up') : 
                   change < 0 ? (lowerIsBetter ? 'up' : 'down') : 'neutral';

  return {
    value: current,
    percentage: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
    direction
  };
}
