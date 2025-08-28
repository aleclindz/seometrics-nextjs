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

    if (!userToken || !domain) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Use DomainQueryService for robust domain lookup
    console.log('[SETUP STATUS] Checking setup status for:', domain);
    
    try {
      // Check if the table exists first using domain query service
      const setupStatusResult = await DomainQueryService.queryTableByDomain(
        'website_setup_status',
        userToken, 
        domain,
        '*'
      );

      if (!setupStatusResult.success && setupStatusResult.error?.includes('does not exist')) {
        // Table doesn't exist, return default status
        console.log('[SETUP STATUS] Table does not exist, returning defaults');
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

      if (!setupStatusResult.success && !setupStatusResult.error?.includes('does not exist')) {
        console.error('Error accessing setup status table:', setupStatusResult.error);
        throw new Error(setupStatusResult.error);
      }

      if (setupStatusResult.success && setupStatusResult.data && setupStatusResult.data.length > 0) {
        const record = setupStatusResult.data[0];
        return NextResponse.json({
          success: true,
          data: {
            gscStatus: record.gsc_status || 'none',
            seoagentjsStatus: record.seoagentjs_status || 'inactive',
            cmsStatus: record.cms_status || 'none',
            hostingStatus: record.hosting_status || 'none',
            setupProgress: record.setup_progress || 0,
            isFullySetup: record.is_fully_setup || false,
            exists: true,
            lastUpdated: record.updated_at
          }
        });
      } else {
        // No record exists, return defaults
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
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Return defaults if database access fails
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
      cmsType,
      hostingStatus,
      hostingProvider
    } = await request.json();

    if (!userToken || !domain) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Since website_setup_status table doesn't exist yet, return success without storing
    console.log('[SETUP STATUS] Setup status table not implemented yet, returning success');
    
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
        message: 'Setup status updated (in-memory only - table not yet implemented)'
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