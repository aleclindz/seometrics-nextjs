import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeDomain(raw: string): string {
  return String(raw || '')
    .replace(/^sc-domain:/i, '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userToken, domain, type, description } = body || {};
    if (!userToken || !domain || !type) {
      return NextResponse.json({ success: false, error: 'userToken, domain, type are required' }, { status: 400 });
    }

    const clean = normalizeDomain(domain);
    const variants = [clean, `https://${clean}`, `sc-domain:${clean}`];

    const { data: website, error } = await supabase
      .from('websites')
      .select('id, business_info')
      .eq('user_token', userToken)
      .or(variants.map(v => `domain.eq.${v}`).join(','))
      .maybeSingle();

    if (error || !website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    let infoObj: any = {};
    try { infoObj = website.business_info ? JSON.parse(website.business_info) : {}; } catch {}
    if (typeof description === 'string') {
      infoObj.description = description;
    }

    const { error: updateError } = await supabase
      .from('websites')
      .update({
        business_type: type,
        business_info: JSON.stringify(infoObj),
        business_confirmed: true,
        business_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', website.id);

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to update business info' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

