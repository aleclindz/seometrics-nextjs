import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MetricsSummary {
  clicks: {
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  indexing: {
    indexed: number;
    total: number;
    percentage: number;
  };
  techScore: {
    score: number;
    maxScore: number;
    percentage: number;
    trend: 'up' | 'down' | 'neutral';
  };
  backlinks: {
    comingSoon: true;
  };
  geoVisibility: {
    comingSoon: true;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('[METRICS SUMMARY] Starting metrics data fetch');
    
    const { siteUrl, userToken } = await request.json();
    
    if (!siteUrl || !userToken) {
      return NextResponse.json({ error: 'Missing required parameters: siteUrl, userToken' }, { status: 400 });
    }

    console.log('[METRICS SUMMARY] Fetching data for:', { siteUrl, userToken: `${userToken.substring(0, 10)}...` });

    // Calculate date ranges for trends
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);
    
    const prevEndDate = new Date(startDate);
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - 28);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Fetch GSC performance data (clicks with trend)
    let clicksData: { value: number; change: number; trend: 'up' | 'down' | 'neutral' } = { value: 0, change: 0, trend: 'neutral' };
    
    try {
      const gscResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/gsc/performance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          userToken
        })
      });

      if (gscResponse.ok) {
        const currentData = await gscResponse.json();
        
        // Get previous period for comparison
        const prevResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/gsc/performance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteUrl,
            startDate: formatDate(prevStartDate),
            endDate: formatDate(prevEndDate),
            userToken
          })
        });

        if (currentData.success && currentData.data) {
          const currentClicks = currentData.data.total.clicks || 0;
          clicksData.value = currentClicks;

          if (prevResponse.ok) {
            const prevData = await prevResponse.json();
            if (prevData.success && prevData.data) {
              const prevClicks = prevData.data.total.clicks || 0;
              if (prevClicks > 0) {
                clicksData.change = Math.round(((currentClicks - prevClicks) / prevClicks) * 100);
                clicksData.trend = clicksData.change > 0 ? 'up' : clicksData.change < 0 ? 'down' : 'neutral';
              }
            }
          }
        }
      } else {
        console.log('[METRICS SUMMARY] GSC data not available - using fallback');
      }
    } catch (error) {
      console.log('[METRICS SUMMARY] Error fetching GSC data:', error);
    }

    // Fetch technical SEO data (indexing status and tech score)
    let indexingData = { indexed: 0, total: 0, percentage: 0 };
    let techScoreData: { score: number; maxScore: number; percentage: number; trend: 'up' | 'down' | 'neutral' } = { score: 0, maxScore: 100, percentage: 0, trend: 'neutral' };

    try {
      const techResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/technical-seo/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl, userToken })
      });

      if (techResponse.ok) {
        const techData = await techResponse.json();
        
        if (techData.success && techData.data) {
          const { overview } = techData.data;
          
          // Indexing data
          indexingData = {
            indexed: overview.indexablePages || 0,
            total: overview.totalPages || 0,
            percentage: overview.totalPages > 0 ? Math.round((overview.indexablePages / overview.totalPages) * 100) : 0
          };

          // Tech Score calculation from priority checks
          const techScore = calculateTechScore(techData.data);
          techScoreData = {
            score: techScore.score,
            maxScore: techScore.maxScore,
            percentage: techScore.percentage,
            trend: techScore.trend
          };
        }
      }
    } catch (error) {
      console.log('[METRICS SUMMARY] Error fetching technical SEO data:', error);
    }

    const summary: MetricsSummary = {
      clicks: clicksData,
      indexing: indexingData,
      techScore: techScoreData,
      backlinks: { comingSoon: true },
      geoVisibility: { comingSoon: true }
    };

    console.log('[METRICS SUMMARY] Successfully compiled metrics for:', siteUrl);

    return NextResponse.json({
      success: true,
      data: summary,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('[METRICS SUMMARY] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics summary' }, 
      { status: 500 }
    );
  }
}

// Calculate Tech Score from technical SEO data
function calculateTechScore(techData: any): { score: number; maxScore: number; percentage: number; trend: 'up' | 'down' | 'neutral' } {
  const { overview, issues } = techData;
  
  // Define priority checks with weights
  const PRIORITY_CHECKS = [
    { name: 'indexability', weight: 30 }, // 30% - Can pages be indexed
    { name: 'mobile_usability', weight: 25 }, // 25% - Mobile friendly
    { name: 'schema_markup', weight: 20 }, // 20% - Structured data
    { name: 'critical_issues', weight: 15 }, // 15% - No critical issues
    { name: 'sitemap_robots', weight: 10 } // 10% - Sitemap & robots.txt
  ];
  
  let totalScore = 0;
  const maxScore = 100;

  // Calculate each check
  if (overview.totalPages > 0) {
    // Indexability score (30%)
    const indexabilityScore = (overview.indexablePages / overview.totalPages) * PRIORITY_CHECKS[0].weight;
    totalScore += indexabilityScore;
    
    // Mobile usability score (25%)
    const mobileScore = (overview.mobileFriendly / overview.totalPages) * PRIORITY_CHECKS[1].weight;
    totalScore += mobileScore;
    
    // Schema markup score (20%)
    const schemaScore = (overview.withSchema / overview.totalPages) * PRIORITY_CHECKS[2].weight;
    totalScore += schemaScore;
  } else {
    // If no pages data, give benefit of the doubt for basic functionality
    totalScore += PRIORITY_CHECKS[0].weight * 0.8; // 80% for indexability
    totalScore += PRIORITY_CHECKS[1].weight * 0.8; // 80% for mobile
  }

  // Critical issues penalty (15%)
  const criticalIssues = issues?.filter((issue: any) => issue.severity === 'critical').length || 0;
  const criticalIssuesScore = criticalIssues === 0 ? PRIORITY_CHECKS[3].weight : Math.max(0, PRIORITY_CHECKS[3].weight - (criticalIssues * 5));
  totalScore += criticalIssuesScore;

  // Sitemap & robots.txt score (10%)
  let infrastructureScore = 0;
  if (techData.sitemap?.status === 'submitted') infrastructureScore += 5;
  if (techData.robots?.exists && techData.robots?.accessible) infrastructureScore += 5;
  totalScore += infrastructureScore;

  // Ensure score is within bounds
  totalScore = Math.min(Math.max(totalScore, 0), maxScore);
  const percentage = Math.round(totalScore);

  return {
    score: percentage,
    maxScore,
    percentage,
    trend: 'neutral' // Could be calculated from historical data in future
  };
}