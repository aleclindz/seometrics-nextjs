import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const domainParam = searchParams.get('domain');

    if (!userToken || !domainParam) {
      return NextResponse.json({ error: 'userToken and domain are required' }, { status: 400 });
    }

    const clean = (d: string) => d.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    const domain = clean(domainParam);

    const variants = [
      domain,
      `sc-domain:${domain}`,
      `https://${domain}`,
      `http://${domain}`,
    ];

    // Try exact matches on domain/cleaned_domain
    const { data: website } = await supabase
      .from('websites')
      .select('id, website_token, domain, cleaned_domain')
      .eq('user_token', userToken)
      .or(`domain.in.(${variants.map(v => `"${v}"`).join(',')}),cleaned_domain.in.(${variants.map(v => `"${v}"`).join(',')})`)
      .limit(1)
      .single();

    if (website?.website_token) {
      return NextResponse.json({ success: true, website, websiteToken: website.website_token });
    }

    // Fallback: partial ilike match
    const { data: fallback } = await supabase
      .from('websites')
      .select('id, website_token, domain, cleaned_domain')
      .eq('user_token', userToken)
      .or(`domain.ilike.%${domain}%,cleaned_domain.ilike.%${domain}%`)
      .limit(1)
      .single();

    if (fallback?.website_token) {
      return NextResponse.json({ success: true, website: fallback, websiteToken: fallback.website_token });
    }

    return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });

  } catch (error) {
    console.error('[WEBSITES TOKEN LOOKUP] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

