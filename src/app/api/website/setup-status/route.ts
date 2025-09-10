import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DomainQueryService } from '@/lib/database/DomainQueryService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const domain = searchParams.get('domain');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    if (!userToken || !domain) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('[SETUP STATUS] Checking setup status for:', domain);
    
    // Query websites table for current status using DomainQueryService
    // Include cleaned_domain for proper URL construction
    const websiteResult = await DomainQueryService.queryTableByDomain(
      'websites',
      userToken, 
      domain,
      'gsc_status, seoagentjs_status, cms_status, hosting_status, last_status_check, domain, cleaned_domain'
    );

    if (!websiteResult.success || !websiteResult.data || websiteResult.data.length === 0) {
      console.log('[SETUP STATUS] Website not found, returning defaults');
      return NextResponse.json({
        success: true,
        data: {
          gscStatus: 'none',
          seoagentjsStatus: 'inactive',
          cmsStatus: 'none',
          hostingStatus: 'none',
          setupProgress: 0,
          isFullySetup: false,
          exists: false
        }
      });
    }

    const website = websiteResult.data[0];
    
    // READ-ONLY MODE: Never automatically refresh statuses
    // Status changes only happen through explicit test button API calls

    // Read current status values directly from database - no automatic updates
    const gscStatus = website.gsc_status;
    const seoagentjsStatus = website.seoagentjs_status;
    const cmsStatus = website.cms_status;
    const hostingStatus = website.hosting_status;

    console.log('[SETUP STATUS] READ-ONLY mode - returning current database values:', {
      domain: website.domain,
      gscStatus,
      seoagentjsStatus,
      cmsStatus,
      hostingStatus
    });

    // Calculate setup progress
    const statuses = [gscStatus, seoagentjsStatus, cmsStatus, hostingStatus];
    const completedCount = statuses.filter(status => 
      status === 'connected' || status === 'active'
    ).length;
    const setupProgress = Math.round((completedCount / 4) * 100);
    const isFullySetup = completedCount === 4;

    return NextResponse.json({
      success: true,
      data: {
        gscStatus,
        seoagentjsStatus,
        cmsStatus,
        hostingStatus,
        setupProgress,
        isFullySetup,
        exists: true,
        lastUpdated: new Date().toISOString(),
        refreshed: false
      }
    });

  } catch (error) {
    console.error('Setup status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      userToken,
      domain,
      gscStatus,
      seoagentjsStatus,
      cmsStatus,
      hostingStatus
    } = await request.json();

    if (!userToken || !domain) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('[SETUP STATUS] Updating connection status for:', domain);
    
    // Update the websites table directly with new status values
    const { data, error } = await supabase
      .from('websites')
      .update({
        gsc_status: gscStatus || 'none',
        seoagentjs_status: seoagentjsStatus || 'inactive',
        cms_status: cmsStatus || 'none',
        hosting_status: hostingStatus || 'none',
        last_status_check: new Date().toISOString()
      })
      .eq('user_token', userToken)
      .or(`domain.eq.${domain},domain.eq.sc-domain:${domain.replace(/^https?:\/\//, '').replace(/^www\./, '')}`)
      .select()
      .single();

    if (error) {
      console.error('[SETUP STATUS] Error updating website status:', error);
      return NextResponse.json(
        { error: 'Failed to update setup status' },
        { status: 500 }
      );
    }
    
    // Calculate progress for response
    const statuses = [gscStatus, seoagentjsStatus, cmsStatus, hostingStatus];
    const completedCount = statuses.filter(status => 
      status === 'connected' || status === 'active'
    ).length;
    const setupProgress = Math.round((completedCount / 4) * 100);
    const isFullySetup = completedCount === 4;
    
    return NextResponse.json({
      success: true,
      data: {
        gscStatus: gscStatus || 'none',
        seoagentjsStatus: seoagentjsStatus || 'inactive',
        cmsStatus: cmsStatus || 'none',
        hostingStatus: hostingStatus || 'none',
        setupProgress,
        isFullySetup,
        lastUpdated: data.last_status_check
      }
    });

  } catch (error) {
    console.error('Setup status update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const {
      userToken,
      domain,
      setupDismissed
    } = await request.json();

    if (!userToken || !domain) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Update setup preferences - first try to find existing record with DomainQueryService
    const existingStatusResult = await DomainQueryService.queryTableByDomain(
      'website_setup_status',
      userToken,
      domain,
      '*'
    );
    
    let targetDomain = domain;
    if (existingStatusResult.success && existingStatusResult.data && existingStatusResult.data.length > 0) {
      // Use the exact domain format from existing record
      targetDomain = existingStatusResult.data[0].domain;
    } else {
      // Normalize domain for new records
      targetDomain = domain.startsWith('sc-domain:') 
        ? domain 
        : `sc-domain:${domain.replace(/^https?:\/\//, '').replace(/^www\./, '')}`;
    }
    
    const { data, error } = await supabase
      .from('website_setup_status')
      .upsert({
        user_token: userToken,
        domain: targetDomain,
        setup_dismissed: setupDismissed,
        setup_dismissed_at: setupDismissed ? new Date().toISOString() : null
      }, {
        onConflict: 'user_token,domain'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating setup preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update setup preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Setup preferences API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}