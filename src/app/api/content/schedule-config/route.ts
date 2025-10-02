import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch content schedule configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const websiteToken = searchParams.get('websiteToken');

    if (!userToken || !websiteToken) {
      return NextResponse.json(
        { success: false, error: 'User token and website token are required' },
        { status: 400 }
      );
    }

    // First verify the website belongs to the user
    const { data: websiteData, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('website_token', websiteToken)
      .eq('user_token', userToken)
      .single();

    if (websiteError || !websiteData) {
      return NextResponse.json(
        { success: false, error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch the content schedule configuration
    const { data: configData, error: configError } = await supabase
      .from('content_schedules')
      .select('*')
      .eq('user_token', userToken)
      .eq('website_token', websiteToken)
      .single();

    if (configError || !configData) {
      // Return default configuration if none exists
      return NextResponse.json({
        success: true,
        config: {
          enabled: false,
          frequency: 'daily',
          daily_count: 1,
          weekly_count: 3,
          monthly_count: 10,
          timezone: 'UTC',
          preferred_hours: [9, 12, 15],
          content_style: 'professional',
          target_word_count: 1200,
          include_images: true,
          auto_publish: false,
          topic_sources: [],
          avoid_topics: [],
          content_pillars: []
        }
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        id: configData.id,
        enabled: configData.enabled,
        frequency: configData.frequency,
        daily_count: configData.daily_count,
        weekly_count: configData.weekly_count,
        monthly_count: configData.monthly_count,
        timezone: configData.timezone,
        preferred_hours: configData.preferred_hours,
        content_style: configData.content_style,
        target_word_count: configData.target_word_count,
        include_images: configData.include_images,
        auto_publish: configData.auto_publish,
        topic_sources: configData.topic_sources || [],
        avoid_topics: configData.avoid_topics || [],
        content_pillars: configData.content_pillars || [],
        next_scheduled_at: configData.next_scheduled_at,
        last_generated_at: configData.last_generated_at
      }
    });

  } catch (error) {
    console.error('Error fetching content schedule config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Save/update content schedule configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userToken, websiteToken, config } = body;

    if (!userToken || !websiteToken || !config) {
      return NextResponse.json(
        { success: false, error: 'User token, website token, and config are required' },
        { status: 400 }
      );
    }

    // First verify the website belongs to the user
    const { data: websiteData, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('website_token', websiteToken)
      .eq('user_token', userToken)
      .single();

    if (websiteError || !websiteData) {
      return NextResponse.json(
        { success: false, error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    // Load existing config to merge fields (only change provided keys)
    let current: any = null;
    try {
      const { data: row } = await supabase
        .from('content_schedules')
        .select('*')
        .eq('user_token', userToken)
        .eq('website_token', websiteToken)
        .maybeSingle();
      current = row || {};
    } catch {}

    const merged: any = {
      enabled: typeof config.enabled === 'boolean' ? config.enabled : (current?.enabled ?? false),
      frequency: config.frequency || current?.frequency || 'daily',
      daily_count: config.daily_count ?? current?.daily_count ?? 1,
      weekly_count: config.weekly_count ?? current?.weekly_count ?? 3,
      monthly_count: config.monthly_count ?? current?.monthly_count ?? 10,
      timezone: current?.timezone || 'UTC',
      preferred_hours: current?.preferred_hours || [9, 12, 15],
      content_style: config.content_style || current?.content_style || 'professional',
      target_word_count: config.target_word_count ?? current?.target_word_count ?? 1200,
      include_images: typeof config.include_images === 'boolean' ? config.include_images : (current?.include_images ?? true),
      auto_publish: typeof config.auto_publish === 'boolean' ? config.auto_publish : (current?.auto_publish ?? false),
      topic_sources: config.topic_sources ?? current?.topic_sources ?? [],
      avoid_topics: config.avoid_topics ?? current?.avoid_topics ?? [],
      content_pillars: config.content_pillars ?? current?.content_pillars ?? []
    };

    // Calculate next scheduled time if enabled
    let nextScheduledAt = current?.next_scheduled_at || null;
    if (merged.enabled) {
      const now = new Date();
      const preferredHours = Array.isArray(merged.preferred_hours) && merged.preferred_hours.length > 0 ? merged.preferred_hours : [9, 12, 15];
      const randomHour = preferredHours[Math.floor(Math.random() * preferredHours.length)];
      // Schedule for tomorrow at the selected hour
      nextScheduledAt = new Date(now);
      nextScheduledAt.setDate(now.getDate() + 1);
      nextScheduledAt.setHours(randomHour, 0, 0, 0);
    }

    // Upsert the configuration (merged)
    const { data: savedConfig, error: saveError } = await supabase
      .from('content_schedules')
      .upsert({
        user_token: userToken,
        website_token: websiteToken,
        enabled: merged.enabled,
        frequency: merged.frequency,
        daily_count: merged.daily_count,
        weekly_count: merged.weekly_count,
        monthly_count: merged.monthly_count,
        timezone: merged.timezone,
        preferred_hours: merged.preferred_hours,
        content_style: merged.content_style,
        target_word_count: merged.target_word_count,
        include_images: merged.include_images,
        auto_publish: merged.auto_publish,
        topic_sources: merged.topic_sources,
        avoid_topics: merged.avoid_topics,
        content_pillars: merged.content_pillars,
        next_scheduled_at: nextScheduledAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'website_token',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving content schedule config:', saveError);
      return NextResponse.json(
        { success: false, error: 'Failed to save configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config: {
        id: savedConfig.id,
        enabled: savedConfig.enabled,
        frequency: savedConfig.frequency,
        daily_count: savedConfig.daily_count,
        weekly_count: savedConfig.weekly_count,
        monthly_count: savedConfig.monthly_count,
        timezone: savedConfig.timezone,
        preferred_hours: savedConfig.preferred_hours,
        content_style: savedConfig.content_style,
        target_word_count: savedConfig.target_word_count,
        include_images: savedConfig.include_images,
        auto_publish: savedConfig.auto_publish,
        topic_sources: savedConfig.topic_sources || [],
        avoid_topics: savedConfig.avoid_topics || [],
        content_pillars: savedConfig.content_pillars || [],
        next_scheduled_at: savedConfig.next_scheduled_at,
        last_generated_at: savedConfig.last_generated_at
      },
      message: 'Content schedule configuration saved successfully'
    });

  } catch (error) {
    console.error('Error saving content schedule config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
