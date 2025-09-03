import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const domain = searchParams.get('domain');

    if (!userToken || !domain) {
      return NextResponse.json({ error: 'User token and domain required' }, { status: 400 });
    }

    // Clean domain to handle various formats
    const cleanDomain = domain.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');

    console.log('[WEBSITE TOKEN LOOKUP] Looking up websiteToken for:', { userToken: `${userToken.substring(0, 10)}...`, domain, cleanDomain });

    // Try to find website by domain or cleaned_domain
    const { data: website, error } = await supabase
      .from('websites')
      .select('website_token, domain, cleaned_domain')
      .eq('user_token', userToken)
      .or(`domain.eq.${domain},domain.eq.sc-domain:${cleanDomain},cleaned_domain.eq.${cleanDomain}`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        console.log('[WEBSITE TOKEN LOOKUP] Website not found for domain:', domain);
        return NextResponse.json({ error: 'Website not found' }, { status: 404 });
      }
      
      console.error('[WEBSITE TOKEN LOOKUP] Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log('[WEBSITE TOKEN LOOKUP] Found website:', { websiteToken: website.website_token, domain: website.domain });

    return NextResponse.json({
      success: true,
      websiteToken: website.website_token,
      domain: website.domain,
      cleanedDomain: website.cleaned_domain
    });

  } catch (error) {
    console.error('[WEBSITE TOKEN LOOKUP] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}