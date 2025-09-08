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

    // 2. CURRENT PERIOD TOTALS
    const currentTotalsQuery = supabase
      .from('gsc_search_analytics')
      .select('clicks, impressions, ctr, position')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .is('query', null) // Aggregated totals
      .is('page', null)
      .is('date', null); // Aggregated across all dates in period

    // 3. COMPARISON PERIOD TOTALS (for trend calculation)
    const comparisonTotalsQuery = compareWith === 'previous' ? supabase
      .from('gsc_search_analytics')
      .select('clicks, impressions, ctr, position')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .gte('date', compareStartDateStr)
      .lte('date', compareEndDateStr)
      .is('query', null)
      .is('page', null)
      .is('date', null) : Promise.resolve({ data: null, error: null });

    // 4. TOP QUERIES (with trends)
    const topQueriesQuery = supabase
      .from('gsc_search_analytics')
      .select('query, clicks, impressions, ctr, position')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .not('query', 'is', null)
      .is('page', null) // Query-only data
      .is('date', null) // Aggregated across date range
      .order('impressions', { ascending: false })
      .limit(20);

    // 5. TOP PAGES
    const topPagesQuery = supabase
      .from('gsc_search_analytics')
      .select('page, clicks, impressions, ctr, position')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .not('page', 'is', null)
      .is('query', null) // Page-only data
      .is('date', null) // Aggregated across date range
      .order('clicks', { ascending: false })
      .limit(20);

    // 6. DEVICE BREAKDOWN
    const deviceBreakdownQuery = supabase
      .from('gsc_search_analytics')
      .select('device, clicks, impressions, ctr, position')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .not('device', 'is', null)
      .is('query', null)
      .is('page', null)
      .is('date', null);

    // 7. COUNTRY BREAKDOWN (top 10)
    const countryBreakdownQuery = supabase
      .from('gsc_search_analytics')
      .select('country, clicks, impressions, ctr, position')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .not('country', 'is', null)
      .is('query', null)
      .is('page', null)
      .is('date', null)
      .order('clicks', { ascending: false })
      .limit(10);

    // 8. SEARCH APPEARANCE DATA (Rich Results)
    const appearanceBreakdownQuery = supabase
      .from('gsc_search_analytics')
      .select('appearance, clicks, impressions, ctr, position')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .not('appearance', 'is', null)
      .is('query', null)
      .is('page', null)
      .is('date', null)
      .order('impressions', { ascending: false });

    // Execute all queries in parallel
    const [
      dailyMetricsResult,
      currentTotalsResult,
      comparisonTotalsResult,
      topQueriesResult,
      topPagesResult,
      deviceBreakdownResult,
      countryBreakdownResult,
      appearanceBreakdownResult
    ] = await Promise.all([
      dailyMetricsQuery,
      currentTotalsQuery,
      comparisonTotalsQuery,
      topQueriesQuery,
      topPagesQuery,
      deviceBreakdownQuery,
      countryBreakdownQuery,
      appearanceBreakdownQuery
    ]);

    // Check for errors
    const errors = [
      dailyMetricsResult.error,
      currentTotalsResult.error,
      comparisonTotalsResult?.error,
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

    // Calculate current period totals
    const currentTotals = currentTotalsResult.data?.[0] || {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0
    };

    // Calculate trends vs comparison period
    const comparisonTotals = comparisonTotalsResult?.data?.[0];
    const trends = comparisonTotals ? {
      clicks: calculateTrend(currentTotals.clicks, comparisonTotals.clicks),
      impressions: calculateTrend(currentTotals.impressions, comparisonTotals.impressions),
      ctr: calculateTrend(currentTotals.ctr, comparisonTotals.ctr),
      position: calculateTrend(currentTotals.position, comparisonTotals.position, true) // Lower position is better
    } : null;

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
      topQueries: (topQueriesResult.data || []).slice(0, 10).map(q => ({
        query: q.query,
        clicks: q.clicks || 0,
        impressions: q.impressions || 0,
        ctr: ((q.ctr || 0) * 100).toFixed(2),
        position: (q.position || 0).toFixed(1)
      })),
      
      topPages: (topPagesResult.data || []).slice(0, 10).map(p => ({
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