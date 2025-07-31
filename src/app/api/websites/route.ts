import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');

    if (!userToken) {
      return NextResponse.json(
        { error: 'Missing userToken parameter' },
        { status: 400 }
      );
    }

    console.log('[WEBSITES API] Fetching websites for user:', userToken);

    // Get user's websites
    const { data: websites, error } = await supabase
      .from('websites')
      .select('id, domain, website_token, created_at, is_managed, is_excluded_from_sync')
      .eq('user_token', userToken)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[WEBSITES API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch websites' },
        { status: 500 }
      );
    }

    console.log('[WEBSITES API] Found websites:', websites?.length || 0);

    return NextResponse.json({
      success: true,
      websites: websites || []
    });

  } catch (error) {
    console.error('[WEBSITES API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const body = await request.json();
    const { websiteId, is_managed } = body;

    if (!userToken || !websiteId || typeof is_managed !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required parameters: userToken, websiteId, is_managed' },
        { status: 400 }
      );
    }

    console.log('[WEBSITES API] Updating website management status:', { websiteId, is_managed });

    // Verify the website belongs to the user
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, domain')
      .eq('website_token', websiteId)
      .eq('user_token', userToken)
      .single();

    if (websiteError || !website) {
      return NextResponse.json(
        { error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    // If setting to managed, check plan limits
    if (is_managed) {
      // Get user's current plan and managed website count
      const { data: userPlan, error: planError } = await supabase
        .from('user_plans')
        .select('plan_id')
        .eq('user_token', userToken)
        .eq('is_active', true)
        .single();

      const currentPlan = userPlan?.plan_id || 'free';

      // Count currently managed websites
      const { count: managedCount } = await supabase
        .from('websites')
        .select('*', { count: 'exact' })
        .eq('user_token', userToken)
        .eq('is_managed', true)
        .neq('website_token', websiteId); // Exclude current website from count

      const planLimits = {
        free: 0, // Free plan: view only, no managed websites
        starter: 1, // Starter plan: 1 managed website
        pro: 5, // Pro plan: 5 managed websites
        enterprise: -1 // Enterprise: unlimited
      };

      const maxAllowed = planLimits[currentPlan as keyof typeof planLimits] || 1;
      
      if (maxAllowed !== -1 && (managedCount || 0) >= maxAllowed) {
        const upgradeMessage = currentPlan === 'free' 
          ? 'Upgrade to Starter plan ($29/month) to manage this website'
          : currentPlan === 'starter'
          ? 'Upgrade to Pro plan ($79/month) to manage up to 5 websites'
          : 'Contact support to increase your website limit';

        return NextResponse.json(
          { 
            error: `You have reached your managed website limit (${maxAllowed} ${maxAllowed === 1 ? 'site' : 'sites'}). ${upgradeMessage}`,
            currentPlan,
            maxAllowed,
            currentCount: managedCount
          },
          { status: 403 }
        );
      }
    }

    // Update the website
    const { error: updateError } = await supabase
      .from('websites')
      .update({ is_managed })
      .eq('website_token', websiteId)
      .eq('user_token', userToken);

    if (updateError) {
      console.error('[WEBSITES API] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update website status' },
        { status: 500 }
      );
    }

    console.log('[WEBSITES API] Updated website management status successfully');

    return NextResponse.json({
      success: true,
      message: `Website ${is_managed ? 'added to' : 'removed from'} managed websites`,
      website: {
        id: websiteId,
        domain: website.domain,
        is_managed
      }
    });

  } catch (error) {
    console.error('[WEBSITES API] PUT Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const websiteId = searchParams.get('websiteId');

    if (!userToken || !websiteId) {
      return NextResponse.json(
        { error: 'Missing required parameters: userToken, websiteId' },
        { status: 400 }
      );
    }

    console.log('[WEBSITES API] Hard deleting website:', websiteId);

    // Verify the website belongs to the user and get domain for exclusion list
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, domain')
      .eq('website_token', websiteId)
      .eq('user_token', userToken)
      .single();

    if (websiteError || !website) {
      return NextResponse.json(
        { error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    // Start a transaction-like operation
    // 1. Add domain to excluded_domains table to prevent GSC re-import
    const { error: excludeError } = await supabase
      .from('excluded_domains')
      .insert({
        user_token: userToken,
        domain: website.domain
      });

    // Don't fail if domain already exists in excluded list
    if (excludeError && !excludeError.code?.includes('23505')) { // 23505 is unique violation
      console.error('[WEBSITES API] Failed to add to excluded domains:', excludeError);
    }

    // 2. Delete related articles first (cascade delete)
    const { error: articlesDeleteError } = await supabase
      .from('articles')
      .delete()
      .eq('website_token', websiteId)
      .eq('user_token', userToken);

    if (articlesDeleteError) {
      console.error('[WEBSITES API] Failed to delete related articles:', articlesDeleteError);
      // Continue with website deletion even if articles deletion fails
    }

    // 3. Hard delete the website record
    const { error: deleteError } = await supabase
      .from('websites')
      .delete()
      .eq('website_token', websiteId)
      .eq('user_token', userToken);

    if (deleteError) {
      console.error('[WEBSITES API] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove website' },
        { status: 500 }
      );
    }

    console.log('[WEBSITES API] Website hard deleted successfully');

    return NextResponse.json({
      success: true,
      message: `Website "${website.domain}" permanently removed from SEOAgent. It will not be re-imported from GSC.`,
      website: {
        id: websiteId,
        domain: website.domain
      }
    });

  } catch (error) {
    console.error('[WEBSITES API] DELETE Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}