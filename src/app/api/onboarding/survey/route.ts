import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userToken,
      websiteBuildingMethod,
      websiteBuildingMethodOther,
      usesCms,
      cmsType,
      cmsTypeOther,
      hostingProvider,
      hostingProviderOther,
      businessType,
      websiteAge,
      monthlyVisitors,
      seoExperience,
      primarySeoGoal,
      interestedInFounderCall,
      acceptedProOffer
    } = body

    if (!userToken) {
      return NextResponse.json(
        { error: 'User token is required' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!websiteBuildingMethod || !hostingProvider || !businessType || !websiteAge || !monthlyVisitors || !seoExperience) {
      return NextResponse.json(
        { error: 'Missing required survey fields' },
        { status: 400 }
      )
    }

    console.log('[ONBOARDING] Saving survey for user:', userToken)

    // Generate unique redemption code if user accepted Pro offer
    const proOfferRedemptionCode = acceptedProOffer 
      ? `FOUNDER_${crypto.randomBytes(8).toString('hex').toUpperCase()}`
      : null

    // Check if survey already exists for this user
    const { data: existingSurvey, error: checkError } = await supabase
      .from('onboarding_surveys')
      .select('id')
      .eq('user_token', userToken)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('[ONBOARDING] Error checking existing survey:', checkError)
      return NextResponse.json(
        { error: 'Database error checking existing survey' },
        { status: 500 }
      )
    }

    let surveyResult

    if (existingSurvey) {
      // Update existing survey
      console.log('[ONBOARDING] Updating existing survey:', existingSurvey.id)
      
      const { data, error } = await supabase
        .from('onboarding_surveys')
        .update({
          website_building_method: websiteBuildingMethod,
          website_building_method_other: websiteBuildingMethodOther || null,
          uses_cms: usesCms,
          cms_type: cmsType || 'none',
          cms_type_other: cmsTypeOther || null,
          hosting_provider: hostingProvider,
          hosting_provider_other: hostingProviderOther || null,
          business_type: businessType,
          website_age: websiteAge,
          monthly_visitors: monthlyVisitors,
          seo_experience: seoExperience,
          primary_seo_goal: primarySeoGoal || null,
          interested_in_founder_call: interestedInFounderCall || false,
          accepted_pro_offer: acceptedProOffer || false,
          pro_offer_redemption_code: proOfferRedemptionCode,
          survey_completed: true,
          survey_step: 5,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_token', userToken)
        .select()
        .single()

      if (error) {
        console.error('[ONBOARDING] Error updating survey:', error)
        return NextResponse.json(
          { error: 'Failed to update survey' },
          { status: 500 }
        )
      }

      surveyResult = data
    } else {
      // Create new survey
      console.log('[ONBOARDING] Creating new survey')
      
      const { data, error } = await supabase
        .from('onboarding_surveys')
        .insert({
          user_token: userToken,
          website_building_method: websiteBuildingMethod,
          website_building_method_other: websiteBuildingMethodOther || null,
          uses_cms: usesCms,
          cms_type: cmsType || 'none',
          cms_type_other: cmsTypeOther || null,
          hosting_provider: hostingProvider,
          hosting_provider_other: hostingProviderOther || null,
          business_type: businessType,
          website_age: websiteAge,
          monthly_visitors: monthlyVisitors,
          seo_experience: seoExperience,
          primary_seo_goal: primarySeoGoal || null,
          interested_in_founder_call: interestedInFounderCall || false,
          accepted_pro_offer: acceptedProOffer || false,
          pro_offer_redemption_code: proOfferRedemptionCode,
          survey_completed: true,
          survey_step: 5,
          completed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('[ONBOARDING] Error creating survey:', error)
        return NextResponse.json(
          { error: 'Failed to create survey' },
          { status: 500 }
        )
      }

      surveyResult = data
    }

    // If user accepted Pro offer, we should also update their user plan  
    if (acceptedProOffer && proOfferRedemptionCode) {
      console.log('[ONBOARDING] User accepted Starter offer, upgrading plan')
      
      // Calculate 1 month from now
      const starterExpiresAt = new Date()
      starterExpiresAt.setMonth(starterExpiresAt.getMonth() + 1)

      // Check if user already has a plan
      const { data: existingPlan, error: planCheckError } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_token', userToken)
        .single()

      if (planCheckError && planCheckError.code !== 'PGRST116') {
        console.error('[ONBOARDING] Error checking existing plan:', planCheckError)
        // Don't fail the survey if plan update fails
      } else if (existingPlan) {
        // Update existing plan to Starter
        const { error: planUpdateError } = await supabase
          .from('user_plans')
          .update({
            tier: 'starter',
            sites_allowed: 1,
            posts_allowed: 4,
            status: 'active',
            expires_at: starterExpiresAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_token', userToken)

        if (planUpdateError) {
          console.error('[ONBOARDING] Error updating plan:', planUpdateError)
        } else {
          console.log('[ONBOARDING] Plan updated to Starter successfully')
        }
      } else {
        // Create new Starter plan
        const { error: planCreateError } = await supabase
          .from('user_plans')
          .insert({
            user_token: userToken,
            tier: 'starter',
            sites_allowed: 1,
            posts_allowed: 4,
            status: 'active',
            expires_at: starterExpiresAt.toISOString()
          })

        if (planCreateError) {
          console.error('[ONBOARDING] Error creating Starter plan:', planCreateError)
        } else {
          console.log('[ONBOARDING] Starter plan created successfully')
        }
      }
    }

    console.log('[ONBOARDING] Survey saved successfully:', surveyResult.id)
    
    // Return response with redemption code if applicable
    const response = {
      success: true,
      surveyId: surveyResult.id,
      message: 'Survey completed successfully'
    }

    if (acceptedProOffer && proOfferRedemptionCode) {
      return NextResponse.json({
        ...response,
        proOffer: {
          redemptionCode: proOfferRedemptionCode,
          calendlyUrl: 'https://calendly.com/alec-baxter/15min',
          message: 'Your Starter plan has been activated! Please book your founder call to complete the process.'
        }
      })
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[ONBOARDING] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userToken = searchParams.get('userToken')

    if (!userToken) {
      return NextResponse.json(
        { error: 'User token is required' },
        { status: 400 }
      )
    }

    console.log('[ONBOARDING] Fetching survey for user:', userToken)

    const { data: survey, error } = await supabase
      .from('onboarding_surveys')
      .select('*')
      .eq('user_token', userToken)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Survey not found
        return NextResponse.json(
          { error: 'Survey not found' },
          { status: 404 }
        )
      }
      
      console.error('[ONBOARDING] Error fetching survey:', error)
      return NextResponse.json(
        { error: 'Failed to fetch survey' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      survey
    })

  } catch (error) {
    console.error('[ONBOARDING] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}