import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { ActivityAggregator, type AggregatedActivity } from '@/lib/activity-aggregator';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface SummaryRequest {
  userToken: string;
  siteUrl: string;
  forceRefresh?: boolean;
  sinceDays?: number;
  websiteStatus?: {
    gscConnected: boolean;
    seoagentjsInstalled: boolean;
    hasAuditScore: boolean;
    criticalIssues: number;
    mobileFriendly: number;
    withSchema: number;
    totalPages: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('[ACTIVITY SUMMARY] Starting activity summary generation');
    
    const { userToken, siteUrl, forceRefresh = false, sinceDays = 7, websiteStatus }: SummaryRequest = await request.json();
    
    if (!userToken || !siteUrl) {
      return NextResponse.json({ 
        error: 'Missing required parameters: userToken, siteUrl' 
      }, { status: 400 });
    }

    // Get user ID from user_token
    const { data: userData, error: userError } = await supabase
      .from('login_users')
      .select('id, email, auth_user_id')
      .eq('token', userToken)
      .single();
    
    if (userError || !userData) {
      return NextResponse.json({ 
        error: 'Invalid user token' 
      }, { status: 401 });
    }

    // Check for cached summary if not forcing refresh
    if (!forceRefresh) {
      const cachedSummary = await ActivityAggregator.getCachedSummary(userToken, siteUrl);
      if (cachedSummary) {
        console.log('[ACTIVITY SUMMARY] Returning cached summary');
        return NextResponse.json({
          success: true,
          data: {
            summary: cachedSummary.summary_text,
            periodStart: cachedSummary.activity_period_start,
            periodEnd: cachedSummary.activity_period_end,
            activityCount: cachedSummary.activity_count,
            generatedAt: cachedSummary.generated_at,
            cached: true
          }
        });
      }
    }

    // Aggregate activity data
    console.log('[ACTIVITY SUMMARY] Aggregating activity data');
    const aggregator = new ActivityAggregator(userToken, siteUrl, sinceDays);
    const aggregatedActivity = await aggregator.aggregateAllActivity();

    if (aggregatedActivity.totalCount === 0) {
      console.log('[ACTIVITY SUMMARY] No activity found, returning default message');
      
      // Generate contextual welcome message based on current setup status and real technical data
      const welcomeMessage = await generateWelcomeMessage(websiteStatus, extractDomainName(siteUrl), userToken, siteUrl);
      
      return NextResponse.json({
        success: true,
        data: {
          summary: welcomeMessage,
          periodStart: aggregatedActivity.periodStart,
          periodEnd: aggregatedActivity.periodEnd,
          activityCount: 0,
          generatedAt: new Date().toISOString(),
          cached: false
        }
      });
    }

    // Generate AI summary with technical SEO context
    console.log('[ACTIVITY SUMMARY] Generating AI summary for', aggregatedActivity.totalCount, 'activities');
    const aiSummary = await generateAISummary(siteUrl, aggregatedActivity, websiteStatus, userToken);

    // Cache the summary
    await ActivityAggregator.saveSummary(
      userToken,
      siteUrl, 
      aiSummary,
      aggregatedActivity,
      userData.id
    );

    console.log('[ACTIVITY SUMMARY] Summary generated and cached successfully');
    return NextResponse.json({
      success: true,
      data: {
        summary: aiSummary,
        periodStart: aggregatedActivity.periodStart,
        periodEnd: aggregatedActivity.periodEnd,
        activityCount: aggregatedActivity.totalCount,
        generatedAt: new Date().toISOString(),
        cached: false
      }
    });

  } catch (error) {
    console.error('[ACTIVITY SUMMARY] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to generate activity summary' }, 
      { status: 500 }
    );
  }
}

async function generateAISummary(siteUrl: string, activity: AggregatedActivity, websiteStatus?: SummaryRequest['websiteStatus'], userToken?: string): Promise<string> {
  const domainName = extractDomainName(siteUrl);
  const timePeriod = getTimePeriodDescription(activity.periodStart, activity.periodEnd);
  
  // Prepare activity data for AI with enhanced metrics
  const activitySummary = await summarizeActivitiesByTypeWithMetrics(activity.activities, userToken!);
  
  // Get current technical SEO status for context
  let technicalContext = '';
  if (userToken) {
    try {
      const technicalStatus = await fetchTechnicalSEOStatus(userToken, siteUrl);
      if (technicalStatus && technicalStatus.issues && technicalStatus.issues.length > 0) {
        const { issues, summary } = technicalStatus;
        
        // Generate specific issue descriptions
        const specificIssues = issues.slice(0, 3).map((issue: any) => {
          const urlsText = issue.affectedUrls > 1 ? ` (affects ${issue.affectedUrls} pages)` : '';
          return `${issue.title}: ${issue.description}${urlsText}`;
        }).join('\n- ');
        
        technicalContext = `\nCurrent SEO Issues Detected:
- Total active issues: ${summary.totalIssues}
- Critical: ${summary.critical}, High: ${summary.high}, Medium: ${summary.medium}
- Categories: ${Object.keys(summary.byCategory).join(', ')}
- Auto-fixable: ${summary.autoFixable}

Specific Issues:
- ${specificIssues}${issues.length > 3 ? `\n- ...and ${issues.length - 3} more issues` : ''}

IMPORTANT: Be very specific about these issues in your response. Don't say "identified important issues" - list the actual problems found.`;
      } else {
        technicalContext = `\nCurrent Technical SEO Status: ✅ No active SEO issues detected! Your website's technical foundation is solid.`;
      }
    } catch (error) {
      console.log('[AI SUMMARY] Could not fetch technical context:', error);
    }
  }

  // Generate next steps based on website status - but first enhance it with actual detection
  const enhancedWebsiteStatus = await enhanceWebsiteStatus(websiteStatus, userToken!, siteUrl, activity);
  const nextSteps = generateNextSteps(enhancedWebsiteStatus, domainName);
  
  const prompt = `You are SEOAgent's friendly assistant. Create a warm, conversational welcome message summarizing what you've accomplished for ${domainName} ${timePeriod}, then provide actionable next steps.

Website: ${domainName}
Period: ${timePeriod}
Total activities: ${activity.totalCount}

Recent activities:
${activitySummary}${technicalContext}

Current website status and recommended next steps:
${nextSteps}

CRITICAL INSTRUCTIONS - READ CAREFULLY:
- ONLY suggest connecting Google Search Console if it's specifically mentioned in the "next steps" section above
- ONLY suggest installing SEOAgent.js if it's specifically mentioned in the "next steps" section above  
- DO NOT suggest "SEO Health Check" - instead say "scan for technical issues" if needed
- If GSC is already connected (evidenced by sitemap data or technical context), acknowledge this success
- If SEOAgent.js is already installed (evidenced by technical context), acknowledge this automation
- Focus on SPECIFIC accomplishments with numbers (e.g., "generated 15 meta tags", "added schema to 8 pages")
- Use the exact time period provided - do not guess or default to "two weeks"

Style Instructions:
- Start with "Welcome back!" or similar friendly greeting
- Use simple, non-technical language that any website owner can understand
- Explain the SEO benefits of each action (why it helps Google find/understand/rank their content)
- Be encouraging and show the value being provided
- Keep it conversational and personalized to ${domainName}
- Use bullet points (•) for major accomplishments
- After accomplishments, add a "Next Steps:" section ONLY if steps are provided above
- Maximum 200 words total
- Be accurate - don't suggest things that are already implemented

Example: "Welcome back! Here's what I've accomplished for ${domainName} this week: • Generated and submitted sitemap to Google Search Console - helping Google find all your pages • Added schema markup to 12 pages - improving how your content appears in search results • Created 25 optimized meta descriptions - making your pages more clickable in search..."

Next Steps format: Only include if specific steps are provided in the data above.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a friendly SEO assistant who explains technical improvements in simple, encouraging terms.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const summary = response.choices[0]?.message?.content;
    if (!summary) {
      throw new Error('No summary generated by AI');
    }

    return summary.trim();
  } catch (error) {
    console.error('[ACTIVITY SUMMARY] AI generation failed:', error);
    
    // Fallback to structured summary
    return generateFallbackSummary(domainName, timePeriod, activity);
  }
}

function generateNextSteps(websiteStatus?: SummaryRequest['websiteStatus'], domainName?: string): string {
  if (!websiteStatus) {
    return `Priority actions needed:
• Connect Google Search Console to track performance
• Install SEOAgent.js for automated optimizations
• Run SEO Health Check to identify issues`;
  }

  const steps: string[] = [];
  
  // Highest priority: Basic connections
  if (!websiteStatus.gscConnected) {
    steps.push('• Connect Google Search Console to track your site\'s search performance and get valuable insights');
  }
  
  if (!websiteStatus.seoagentjsInstalled) {
    steps.push('• Install SEOAgent.js tracking script to enable automated technical SEO fixes');
  }
  
  // Medium priority: Health check and critical issues
  if (!websiteStatus.hasAuditScore) {
    steps.push('• Run your first comprehensive SEO Health Check to identify optimization opportunities');
  } else if (websiteStatus.criticalIssues > 0) {
    steps.push(`• Address ${websiteStatus.criticalIssues} critical SEO issues to improve search rankings`);
  }
  
  // Lower priority: Technical improvements
  if (websiteStatus.totalPages > 0) {
    if (websiteStatus.mobileFriendly < websiteStatus.totalPages) {
      const mobileIssues = websiteStatus.totalPages - websiteStatus.mobileFriendly;
      steps.push(`• Fix mobile-friendliness issues on ${mobileIssues} pages for better mobile rankings`);
    }
    
    if (websiteStatus.withSchema < websiteStatus.totalPages) {
      const schemaNeeded = websiteStatus.totalPages - websiteStatus.withSchema;
      steps.push(`• Add schema markup to ${schemaNeeded} pages to enhance search result appearance`);
    }
  }
  
  // If everything is good, suggest advanced optimizations
  if (steps.length === 0) {
    steps.push('• Great job! Your SEO setup is solid. Focus on creating quality content and building backlinks');
    steps.push('• Monitor performance regularly and optimize based on search console data');
  }
  
  return steps.slice(0, 3).join('\n'); // Limit to top 3 recommendations
}

function generateFallbackSummary(domainName: string, timePeriod: string, activity: AggregatedActivity): string {
  const activitySummary = summarizeActivitiesByType(activity.activities);
  const majorActivities = activity.activities
    .filter(a => a.impact === 'high' || a.impact === 'medium')
    .slice(0, 3);

  let summary = `Welcome back! Here's what I've accomplished for ${domainName} ${timePeriod}:\n\n`;
  
  majorActivities.forEach(activity => {
    summary += `• ${activity.action}\n`;
  });

  if (activity.totalCount > majorActivities.length) {
    summary += `\nPlus ${activity.totalCount - majorActivities.length} additional optimizations running in the background.`;
  }

  summary += '\n\nI\'m continuously monitoring and improving your SEO automatically!';
  
  return summary;
}

async function summarizeActivitiesByTypeWithMetrics(activities: any[], userToken?: string): Promise<string> {
  const grouped = activities.reduce((acc, activity) => {
    if (!acc[activity.type]) {
      acc[activity.type] = [];
    }
    acc[activity.type].push(activity);
    return acc;
  }, {} as Record<string, any[]>);

  let summary = '';
  
  // Add actual SEO metrics if we have a user token
  if (userToken) {
    try {
      const { data: metaTags } = await supabase
        .from('seo_tags')
        .select('id')
        .eq('user_token', userToken)
        .eq('tag_type', 'meta');
      
      const { data: altTags } = await supabase
        .from('seo_tags')  
        .select('id')
        .eq('user_token', userToken)
        .eq('tag_type', 'alt');

      const { data: articles } = await supabase
        .from('generated_articles')
        .select('id, title')
        .eq('user_token', userToken);

      const { data: sitemaps } = await supabase
        .from('sitemap_submissions')
        .select('id, sitemap_url, status, last_downloaded')
        .eq('user_token', userToken);

      // Add specific metrics to summary
      if (metaTags && metaTags.length > 0) {
        summary += `Meta Tag Generation: Created ${metaTags.length} optimized meta descriptions and titles\n`;
      }
      
      if (altTags && altTags.length > 0) {
        summary += `Alt Tag Generation: Added ${altTags.length} descriptive alt tags for better accessibility and SEO\n`;
      }

      if (sitemaps && sitemaps.length > 0) {
        const downloadedSitemaps = sitemaps.filter(s => s.last_downloaded);
        summary += `Sitemap Management: ${downloadedSitemaps.length > 0 ? 'Generated and submitted sitemap to Google Search Console' : 'Generated sitemap files'}\n`;
      }

      if (articles && articles.length > 0) {
        summary += `Content Generation: Created ${articles.length} SEO-optimized articles\n`;
      }

      console.log('[ACTIVITY SUMMARY] Added metrics:', {
        metaTags: metaTags?.length || 0,
        altTags: altTags?.length || 0,
        sitemaps: sitemaps?.length || 0,
        articles: articles?.length || 0
      });
    } catch (error) {
      console.error('[ACTIVITY SUMMARY] Error fetching metrics:', error);
    }
  }

  // Add grouped activities (fallback)
  Object.entries(grouped).forEach(([type, items]) => {
    const typedItems = items as any[];
    summary += `${type}: ${typedItems.length} activities\n`;
    typedItems.slice(0, 2).forEach(item => {
      summary += `  - ${item.action} (${item.status})\n`;
    });
  });

  return summary;
}

function summarizeActivitiesByType(activities: any[]): string {
  const grouped = activities.reduce((acc, activity) => {
    if (!acc[activity.type]) {
      acc[activity.type] = [];
    }
    acc[activity.type].push(activity);
    return acc;
  }, {} as Record<string, any[]>);

  let summary = '';
  Object.entries(grouped).forEach(([type, items]) => {
    const typedItems = items as any[];
    summary += `${type}: ${typedItems.length} activities\n`;
    typedItems.slice(0, 3).forEach(item => {
      summary += `  - ${item.action} (${item.status})\n`;
    });
  });

  return summary;
}

function extractDomainName(url: string): string {
  try {
    const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return domain;
  } catch {
    return url;
  }
}

function getTimePeriodDescription(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 1) return 'today';
  if (diffDays <= 7) return 'this week';
  if (diffDays <= 14) return 'the past two weeks';
  if (diffDays <= 30) return 'this month';
  return `the past ${Math.ceil(diffDays / 7)} weeks`;
}

async function generateWelcomeMessage(websiteStatus: SummaryRequest['websiteStatus'], domainName: string, userToken: string, siteUrl: string): Promise<string> {
  // Use generic greeting instead of domain-specific welcome
  let message = "Hi! I'm SEOAgent, your automated SEO assistant. ";
  
  if (!websiteStatus) {
    // Fallback when we don't have status information
    message += "Once you connect Google Search Console and install SEOAgent.js, I'll start optimizing your website automatically and provide personalized activity summaries here.";
    return message;
  }
  
  const isFullySetup = websiteStatus.gscConnected && websiteStatus.seoagentjsInstalled;
  
  if (isFullySetup) {
    // Get real technical SEO status using agent intelligence
    try {
      const technicalStatus = await fetchTechnicalSEOStatus(userToken, siteUrl);
      
      if (technicalStatus && technicalStatus.issues && technicalStatus.issues.length > 0) {
        const { issues, summary } = technicalStatus;
        
        message += `I'm actively monitoring ${domainName} and have identified specific SEO issues that need attention:\n\n`;
        
        // List the top 3 specific issues
        const topIssues = issues.slice(0, 3);
        topIssues.forEach((issue: any, index: number) => {
          const urlsText = issue.affectedUrls > 1 ? ` (${issue.affectedUrls} pages affected)` : '';
          message += `• ${issue.title}${urlsText} - ${issue.description}\n`;
        });
        
        if (issues.length > 3) {
          message += `• ...and ${issues.length - 3} additional issues\n`;
        }
        
        message += `\nSummary: ${summary.critical} critical, ${summary.high} high priority, ${summary.medium} medium priority issues detected.`;
        
        if (summary.autoFixable > 0) {
          message += ` ${summary.autoFixable} of these can be fixed automatically with one click.`;
        }
        
        message += "\n\nThese specific issues are affecting your search engine visibility. Click the action items below to start fixing them!";
        
        return message;
      } else {
        message += "Your setup looks great! I'm monitoring your website and haven't detected any critical issues. ";
        message += "I'll continue watching for optimization opportunities.";
      }
    } catch (error) {
      console.error('[WELCOME MESSAGE] Error fetching technical status:', error);
      message += "Your setup looks great! I'm monitoring your website and will show optimization activities here once I detect opportunities to improve your SEO.";
    }
  } else {
    // Still need setup
    message += "To get started, I need you to:";
    const setupSteps = [];
    
    if (!websiteStatus.gscConnected) {
      setupSteps.push("Connect Google Search Console to track your site's performance");
    }
    
    if (!websiteStatus.seoagentjsInstalled) {
      setupSteps.push("Install SEOAgent.js to enable automated technical SEO fixes");
    }
    
    if (setupSteps.length === 1) {
      message += ` ${setupSteps[0]}.`;
    } else if (setupSteps.length === 2) {
      message += ` ${setupSteps[0]} and ${setupSteps[1]}.`;
    }
    
    message += " Once connected, I'll start optimizing your website automatically!";
  }
  
  return message;
}

// Enhanced website status detection
async function enhanceWebsiteStatus(
  websiteStatus: SummaryRequest['websiteStatus'], 
  userToken: string, 
  siteUrl: string,
  aggregatedActivity: AggregatedActivity
): Promise<SummaryRequest['websiteStatus']> {
  try {
    // Start with provided status or defaults
    const enhanced: SummaryRequest['websiteStatus'] = {
      gscConnected: websiteStatus?.gscConnected || false,
      seoagentjsInstalled: websiteStatus?.seoagentjsInstalled || false,
      hasAuditScore: websiteStatus?.hasAuditScore || false,
      criticalIssues: websiteStatus?.criticalIssues || 0,
      mobileFriendly: websiteStatus?.mobileFriendly || 0,
      withSchema: websiteStatus?.withSchema || 0,
      totalPages: websiteStatus?.totalPages || 0
    };

    // Detect GSC connection by checking for sitemap submissions or GSC data
    try {
      const { data: sitemaps } = await supabase
        .from('sitemap_submissions')
        .select('id')
        .eq('user_token', userToken)
        .limit(1);
      
      if (sitemaps && sitemaps.length > 0) {
        enhanced.gscConnected = true;
        console.log('[ENHANCED STATUS] GSC detected via sitemap submissions');
      }
    } catch (error) {
      console.log('[ENHANCED STATUS] Could not check GSC status:', error);
    }

    // Detect SEOAgent.js installation by checking the actual website
    try {
      const baseUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
      const homeResponse = await fetch(baseUrl, {
        method: 'GET',
        timeout: 5000,
        headers: { 'User-Agent': 'SEOAgent-StatusBot/1.0' }
      } as any);
      
      if (homeResponse.ok) {
        const homeContent = await homeResponse.text();
        const hasScript = homeContent.includes('seoagent.js') || homeContent.includes('SEO-METRICS');
        const hasWebsiteToken = homeContent.includes('idv = ') || homeContent.includes('website_token');
        
        if (hasScript && hasWebsiteToken) {
          enhanced.seoagentjsInstalled = true;
          console.log('[ENHANCED STATUS] SEOAgent.js detected via website analysis');
        }
      }
    } catch (error) {
      console.log('[ENHANCED STATUS] Could not check SEOAgent.js status:', error);
    }

    // Check if we have any technical analysis (indicates audit was run)
    try {
      const { data: actionItems } = await supabase
        .from('seo_action_items')
        .select('id')
        .eq('user_token', userToken)
        .limit(1);
      
      if (actionItems && actionItems.length > 0) {
        enhanced.hasAuditScore = true;
        console.log('[ENHANCED STATUS] Technical audit detected via action items');
      }
    } catch (error) {
      console.log('[ENHANCED STATUS] Could not check audit status:', error);
    }

    // Get actual SEO metrics counts from database
    try {
      const { data: metaTags } = await supabase
        .from('seo_tags')
        .select('id')
        .eq('user_token', userToken)
        .eq('tag_type', 'meta');
      
      const { data: altTags } = await supabase
        .from('seo_tags')  
        .select('id')
        .eq('user_token', userToken)
        .eq('tag_type', 'alt');

      const { data: schemaData } = await supabase
        .from('schema_analyses')
        .select('pages_with_schema')
        .eq('user_token', userToken)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .single();

      // Update counts based on actual data
      enhanced.totalPages = Math.max(
        enhanced.totalPages || 0,
        (metaTags?.length || 0) + (altTags?.length || 0)
      );
      enhanced.withSchema = schemaData?.pages_with_schema || enhanced.withSchema || 0;
      
      console.log('[ENHANCED STATUS] SEO metrics detected:', {
        metaTags: metaTags?.length || 0,
        altTags: altTags?.length || 0, 
        schemaPages: enhanced.withSchema
      });
    } catch (error) {
      console.log('[ENHANCED STATUS] Could not fetch SEO metrics:', error);
    }

    return enhanced;
  } catch (error) {
    console.error('[ENHANCED STATUS] Error enhancing website status:', error);
    return websiteStatus || {
      gscConnected: false,
      seoagentjsInstalled: false,
      hasAuditScore: false,
      criticalIssues: 0,
      mobileFriendly: 0,
      withSchema: 0,
      totalPages: 0
    };
  }
}

// Helper function to fetch technical SEO status
async function fetchTechnicalSEOStatus(userToken: string, siteUrl: string) {
  try {
    // Fetch action items instead of old technical SEO data
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/action-items?userToken=${userToken}&siteUrl=${encodeURIComponent(siteUrl)}&status=detected,assigned,in_progress,completed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch action items data');
    }

    const result = await response.json();
    
    if (result.success && result.actionItems) {
      const items = result.actionItems;
      
      return {
        issues: items.map((item: any) => ({
          type: item.issue_type,
          severity: item.severity,
          title: item.title,
          description: item.description,
          category: item.issue_category,
          status: item.status,
          canAutoFix: ['sitemap_missing', 'sitemap_not_downloaded', 'sitemap_not_submitted', 'sitemap_broken', 'sitemap_dynamic_not_submitted', 'robots_not_analyzed', 'schema_missing_pages', 'indexing_blocked_pages'].includes(item.issue_type),
          affectedUrls: item.affected_urls?.length || 1
        })),
        summary: {
          totalIssues: items.length,
          critical: items.filter((i: any) => i.severity === 'critical').length,
          high: items.filter((i: any) => i.severity === 'high').length,
          medium: items.filter((i: any) => i.severity === 'medium').length,
          low: items.filter((i: any) => i.severity === 'low').length,
          byCategory: items.reduce((acc: any, item: any) => {
            acc[item.issue_category] = (acc[item.issue_category] || 0) + 1;
            return acc;
          }, {}),
          autoFixable: items.filter((i: any) => ['sitemap_missing', 'sitemap_not_downloaded', 'sitemap_not_submitted', 'sitemap_broken', 'sitemap_dynamic_not_submitted', 'robots_not_analyzed', 'schema_missing_pages', 'indexing_blocked_pages'].includes(i.issue_type)).length
        }
      };
    }
    
    return {
      issues: [],
      summary: {
        totalIssues: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        byCategory: {},
        autoFixable: 0
      }
    };
  } catch (error) {
    console.error('Error fetching technical SEO status:', error);
    return null;
  }
}