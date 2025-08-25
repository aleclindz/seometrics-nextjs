import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const websiteToken = searchParams.get('token')

    if (!websiteToken) {
      return NextResponse.json(
        { error: 'Website token required' },
        { status: 400 }
      )
    }

    console.log('[ATTRIBUTION CHECK] Checking for website token:', websiteToken)

    // Get website info and user token
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('user_token')
      .eq('website_token', websiteToken)
      .single()

    if (websiteError || !website) {
      console.log('[ATTRIBUTION CHECK] Website not found for token:', websiteToken)
      return NextResponse.json(
        { requireAttribution: true }, // Default to requiring attribution for security
        { status: 200 }
      )
    }

    console.log('[ATTRIBUTION CHECK] Found website, user token:', website.user_token)

    // Get user's plan from user_plans table
    const { data: userPlan, error: planError } = await supabase
      .from('user_plans')
      .select('tier')
      .eq('user_token', website.user_token)
      .single()

    if (planError || !userPlan) {
      // If no plan exists, check login_users.plan for legacy users
      console.log('[ATTRIBUTION CHECK] No user_plans found, checking login_users')
      
      const { data: loginUser, error: loginError } = await supabase
        .from('login_users')
        .select('plan')
        .eq('token', website.user_token)
        .single()

      if (loginError || !loginUser) {
        console.log('[ATTRIBUTION CHECK] No user found, requiring attribution')
        return NextResponse.json({ requireAttribution: true })
      }

      // login_users.plan: 0 = free, 1 = paid
      const requireAttribution = loginUser.plan === 0
      console.log('[ATTRIBUTION CHECK] User plan from login_users:', loginUser.plan, 'requiring attribution:', requireAttribution)
      
      return NextResponse.json({ requireAttribution })
    }

    // user_plans.tier: 'free' requires attribution, others don't
    const requireAttribution = userPlan.tier === 'free'
    console.log('[ATTRIBUTION CHECK] User tier:', userPlan.tier, 'requiring attribution:', requireAttribution)

    return NextResponse.json({ requireAttribution })

  } catch (error) {
    console.error('[ATTRIBUTION CHECK] Error:', error)
    return NextResponse.json(
      { requireAttribution: true }, // Default to requiring attribution on error
      { status: 200 }
    )
  }
}