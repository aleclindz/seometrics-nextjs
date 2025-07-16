import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateToken } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile, create if doesn't exist
    let { data: userProfile, error: userError } = await supabase
      .from('login_users')
      .select('token')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !userProfile) {
      // Try to create the user profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('login_users')
        .insert({
          email: user.email || '',
          auth_user_id: user.id,
          token: generateToken()
        })
        .select('token')
        .single();

      if (createError || !newProfile) {
        console.error('Failed to create user profile:', createError);
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
      }

      userProfile = newProfile;
    }

    // Get user's websites
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select('*')
      .eq('user_token', userProfile.token)
      .order('created_at', { ascending: false });

    if (websitesError) {
      return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
    }

    return NextResponse.json({ websites });
  } catch (error) {
    console.error('Error fetching websites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { domain, language, enableMetaTags, enableImageTags } = body;

    // Validate domain
    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainPattern.test(domain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    // Get user profile, create if doesn't exist
    let { data: userProfile, error: userError } = await supabase
      .from('login_users')
      .select('token')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !userProfile) {
      // Try to create the user profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('login_users')
        .insert({
          email: user.email || '',
          auth_user_id: user.id,
          token: generateToken()
        })
        .select('token')
        .single();

      if (createError || !newProfile) {
        console.error('Failed to create user profile:', createError);
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
      }

      userProfile = newProfile;
    }

    // Check if domain already exists for this user
    const { data: existingWebsite } = await supabase
      .from('websites')
      .select('id')
      .eq('domain', domain)
      .eq('user_token', userProfile.token)
      .single();

    if (existingWebsite) {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 409 });
    }

    // Create website
    const { data: website, error: insertError } = await supabase
      .from('websites')
      .insert({
        user_token: userProfile.token,
        domain,
        language: language || 'english',
        enable_meta_tags: enableMetaTags ?? true,
        enable_image_tags: enableImageTags ?? true,
        meta_tags: 0,
        image_tags: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating website:', insertError);
      return NextResponse.json({ error: 'Failed to create website' }, { status: 500 });
    }

    return NextResponse.json({ website }, { status: 201 });
  } catch (error) {
    console.error('Error creating website:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}