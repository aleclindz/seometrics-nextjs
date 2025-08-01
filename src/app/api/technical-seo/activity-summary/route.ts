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
}

export async function POST(request: NextRequest) {
  try {
    console.log('[ACTIVITY SUMMARY] Starting activity summary generation');
    
    const { userToken, siteUrl, forceRefresh = false, sinceDays = 7 }: SummaryRequest = await request.json();
    
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
      return NextResponse.json({
        success: true,
        data: {
          summary: `Welcome to ${extractDomainName(siteUrl)}! I'm SEOAgent, your automated SEO assistant. Once you install the Smart.js tracking script and connect Google Search Console, I'll start optimizing your website automatically and provide personalized activity summaries here.`,
          periodStart: aggregatedActivity.periodStart,
          periodEnd: aggregatedActivity.periodEnd,
          activityCount: 0,
          generatedAt: new Date().toISOString(),
          cached: false
        }
      });
    }

    // Generate AI summary
    console.log('[ACTIVITY SUMMARY] Generating AI summary for', aggregatedActivity.totalCount, 'activities');
    const aiSummary = await generateAISummary(siteUrl, aggregatedActivity);

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

async function generateAISummary(siteUrl: string, activity: AggregatedActivity): Promise<string> {
  const domainName = extractDomainName(siteUrl);
  const timePeriod = getTimePeriodDescription(activity.periodStart, activity.periodEnd);
  
  // Prepare activity data for AI
  const activitySummary = summarizeActivitiesByType(activity.activities);
  
  const prompt = `You are SEOAgent's friendly assistant. Create a warm, conversational welcome message summarizing what you've accomplished for ${domainName} ${timePeriod}.

Website: ${domainName}
Period: ${timePeriod}
Total activities: ${activity.totalCount}

Recent activities:
${activitySummary}

Instructions:
- Start with "Welcome back!" or similar friendly greeting
- Use simple, non-technical language that any website owner can understand
- Explain the SEO benefits of each action (why it helps Google find/understand/rank their content)
- Be encouraging and show the value being provided
- Keep it conversational and personalized to ${domainName}
- Use bullet points (•) for major accomplishments
- End with a brief forward-looking statement about continued optimization
- Maximum 150 words
- Focus on the most impactful activities first

Example tone: "Welcome back! Here's what I've accomplished for ${domainName} this week: • Added schema markup to 5 pages - this helps Google display rich snippets with your business info • Generated a fresh sitemap and submitted it to Google - your new blog posts are now being discovered faster..."`;

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