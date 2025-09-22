import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Get automation settings and quota information for a website
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const websiteToken = searchParams.get('websiteToken');

    if (!userToken) {
      return NextResponse.json(
        { success: false, error: 'User token is required' },
        { status: 400 }
      );
    }

    // Get website automation settings
    let websiteQuery = supabase
      .from('websites')
      .select('id, domain, enable_automated_content, website_token')
      .eq('user_token', userToken);

    if (websiteToken) {
      websiteQuery = websiteQuery.eq('website_token', websiteToken);
    }

    const { data: websites, error: websiteError } = await websiteQuery;

    if (websiteError) {
      throw websiteError;
    }

    // Get user plan information
    const { data: userPlanData, error: planError } = await supabase
      .from('user_plans')
      .select('tier')
      .eq('user_token', userToken)
      .order('created_at', { ascending: false })
      .limit(1);

    if (planError) {
      console.error('Error fetching user plan:', planError);
    }

    const userTier = userPlanData?.[0]?.tier || 'free';

    // Calculate quota based on plan
    let quotaLimit = 0;
    let articlesRemaining = 0;

    if (userTier === 'free') {
      quotaLimit = 0;
      articlesRemaining = 0;
    } else if (userTier === 'starter' || userTier === 'pro' || userTier === 'enterprise') {
      quotaLimit = -1; // Unlimited
      articlesRemaining = -1; // Unlimited
    }

    // Get plan-based frequency
    const getPlanFrequency = (tier: string) => {
      switch (tier) {
        case 'starter': return '3x_weekly';
        case 'pro': return 'daily';
        case 'enterprise': return '3x_daily';
        default: return 'weekly';
      }
    };

    const planBasedFrequency = getPlanFrequency(userTier);

    // Get article count for current month for display purposes
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: articleCount, error: countError } = await supabase
      .from('articles')
      .select('id', { count: 'exact' })
      .eq('user_token', userToken)
      .gte('created_at', `${currentMonth}-01T00:00:00.000Z`)
      .lt('created_at', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()}`);

    const articlesUsed = articleCount?.length || 0;

    // Get content schedule settings for each website
    const websiteTokens = websites?.map(w => w.website_token) || [];
    let scheduleData: any[] = [];

    if (websiteTokens.length > 0) {
      const { data: schedules, error: scheduleError } = await supabase
        .from('content_schedules')
        .select('website_token, enabled, frequency, auto_publish, next_scheduled_at')
        .eq('user_token', userToken)
        .in('website_token', websiteTokens);

      if (!scheduleError) {
        scheduleData = schedules || [];
      }
    }

    // Format response
    const websitesWithSettings = websites?.map(website => {
      const schedule = scheduleData.find(s => s.website_token === website.website_token);

      return {
        ...website,
        scheduling: schedule ? {
          enabled: schedule.enabled,
          frequency: planBasedFrequency, // Use plan-based frequency instead of stored frequency
          auto_publish: schedule.auto_publish,
          next_scheduled_at: schedule.next_scheduled_at
        } : {
          enabled: false,
          frequency: planBasedFrequency, // Use plan-based frequency
          auto_publish: false,
          next_scheduled_at: null
        }
      };
    });

    // Calculate billing period dates
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const quota = {
      quota_limit: quotaLimit,
      articles_used: articlesUsed,
      articles_remaining: articlesRemaining,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: {
        websites: websitesWithSettings,
        quota: {
          limit: quota.quota_limit,
          used: quota.articles_used,
          remaining: quota.articles_remaining,
          billing_period: {
            start: quota.start_date,
            end: quota.end_date
          }
        }
      }
    });

  } catch (error) {
    console.error('[AUTOMATION SETTINGS] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch automation settings' },
      { status: 500 }
    );
  }
}

// PUT: Update automation settings for a website
export async function PUT(request: NextRequest) {
  try {
    const { userToken, websiteToken, enable_automated_content, scheduling } = await request.json();

    if (!userToken || !websiteToken) {
      return NextResponse.json(
        { success: false, error: 'User token and website token are required' },
        { status: 400 }
      );
    }

    // Verify website ownership
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('user_token', userToken)
      .eq('website_token', websiteToken)
      .single();

    if (websiteError || !website) {
      return NextResponse.json(
        { success: false, error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    // Update website automation setting
    if (typeof enable_automated_content === 'boolean') {
      const { error: updateError } = await supabase
        .from('websites')
        .update({ enable_automated_content })
        .eq('user_token', userToken)
        .eq('website_token', websiteToken);

      if (updateError) {
        throw updateError;
      }
    }

    // Update or create content schedule if scheduling data provided
    if (scheduling) {
      // Get user plan to determine correct frequency
      const { data: userPlanData, error: planError } = await supabase
        .from('user_plans')
        .select('tier')
        .eq('user_token', userToken)
        .order('created_at', { ascending: false })
        .limit(1);

      const userTier = userPlanData?.[0]?.tier || 'free';

      // Get plan-based frequency
      const getPlanFrequency = (tier: string) => {
        switch (tier) {
          case 'starter': return '3x_weekly';
          case 'pro': return 'daily';
          case 'enterprise': return '3x_daily';
          default: return 'weekly';
        }
      };

      const { error: scheduleError } = await supabase
        .from('content_schedules')
        .upsert({
          user_token: userToken,
          website_token: websiteToken,
          enabled: scheduling.enabled || false,
          frequency: getPlanFrequency(userTier), // Use plan-based frequency
          auto_publish: scheduling.auto_publish || false,
          updated_at: new Date().toISOString()
        });

      if (scheduleError) {
        console.error('Error updating schedule:', scheduleError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Automation settings updated successfully'
    });

  } catch (error) {
    console.error('[AUTOMATION SETTINGS] Update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update automation settings' },
      { status: 500 }
    );
  }
}

// POST: Check if user can generate an article (quota check)
export async function POST(request: NextRequest) {
  try {
    const { userToken, action } = await request.json();

    if (!userToken) {
      return NextResponse.json(
        { success: false, error: 'User token is required' },
        { status: 400 }
      );
    }

    if (action === 'check_quota') {
      // Get user plan to determine if they can generate articles
      const { data: userPlanData, error: planError } = await supabase
        .from('user_plans')
        .select('tier')
        .eq('user_token', userToken)
        .order('created_at', { ascending: false })
        .limit(1);

      if (planError) {
        throw planError;
      }

      const userTier = userPlanData?.[0]?.tier || 'free';
      const canGenerate = userTier !== 'free'; // All paid plans can generate articles

      return NextResponse.json({
        success: true,
        data: {
          can_generate: canGenerate,
          action: 'check_quota'
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[AUTOMATION SETTINGS] Action error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process action' },
      { status: 500 }
    );
  }
}