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

    // Use DomainQueryService for robust domain-based operations
    let data;
    try {
      // Check if table exists and if record already exists using DomainQueryService
      const existingStatusResult = await DomainQueryService.queryTableByDomain(
        'website_setup_status',
        userToken,
        domain,
        '*'
      );
      
      let existingRecord = null;
      let selectError = null;
      
      if (existingStatusResult.success && existingStatusResult.data && existingStatusResult.data.length > 0) {
        existingRecord = existingStatusResult.data[0];
      } else if (!existingStatusResult.success && !existingStatusResult.error?.includes('does not exist')) {
        selectError = { code: 'QUERY_ERROR', message: existingStatusResult.error };
      } else if (existingStatusResult.error?.includes('does not exist')) {
        selectError = { code: '42P01', message: 'relation "website_setup_status" does not exist' };
      }

      if (selectError && selectError.code === '42P01') {
        // Table doesn't exist, just return success for now
        console.log('[SETUP STATUS] Table does not exist, cannot store status');
        return NextResponse.json({
          success: true,
          data: {
            message: 'Setup status tracking not yet available - table does not exist'
          }
        });
      }

      // Calculate progress manually
      const statuses = [
        gscStatus || existingRecord?.gsc_status,
        seoagentjsStatus || existingRecord?.seoagentjs_status,
        cmsStatus || existingRecord?.cms_status,
        hostingStatus || existingRecord?.hosting_status
      ];
      
      const completedCount = statuses.filter(status => 
        status === 'connected' || status === 'active'
      ).length;
      
      const setupProgress = Math.round((completedCount / 4) * 100);
      const isFullySetup = completedCount === 4;

      let error;
      if (existingRecord && !selectError) {
        // Update existing record - use the matched domain format from DomainQueryService
        const updateData: any = {
          updated_at: new Date().toISOString(),
          setup_progress: setupProgress,
          is_fully_setup: isFullySetup
        };
        
        if (gscStatus) updateData.gsc_status = gscStatus;
        if (seoagentjsStatus) updateData.seoagentjs_status = seoagentjsStatus;
        if (cmsStatus) updateData.cms_status = cmsStatus;
        if (cmsType) updateData.cms_type = cmsType;
        if (hostingStatus) updateData.hosting_status = hostingStatus;
        if (hostingProvider) updateData.hosting_provider = hostingProvider;

        const updateResult = await supabase
          .from('website_setup_status')
          .update(updateData)
          .eq('user_token', userToken)
          .eq('domain', existingRecord.domain) // Use exact domain format from existing record
          .select()
          .single();
        
        data = updateResult.data;
        error = updateResult.error;
      } else {
        // Insert new record - normalize domain for consistency
        const normalizedDomain = domain.startsWith('sc-domain:') 
          ? domain 
          : `sc-domain:${domain.replace(/^https?:\/\//, '').replace(/^www\./, '')}`;
          
        const insertResult = await supabase
          .from('website_setup_status')
          .insert({
            user_token: userToken,
            domain: normalizedDomain,
            gsc_status: gscStatus || 'none',
            seoagentjs_status: seoagentjsStatus || 'inactive',
            cms_status: cmsStatus || 'none',
            cms_type: cmsType,
            hosting_status: hostingStatus || 'none',
            hosting_provider: hostingProvider,
            setup_progress: setupProgress,
            is_fully_setup: isFullySetup
          })
          .select()
          .single();
        
        data = insertResult.data;
        error = insertResult.error;
      }

      if (error) {
        console.error('Error updating setup status:', error);
        return NextResponse.json(
          { error: 'Failed to update setup status' },
          { status: 500 }
        );
      }
    } catch (tableError: any) {
      console.error('Table access error:', tableError);
      // Return success even if table doesn't exist
      return NextResponse.json({
        success: true,
        data: {
          message: 'Setup status tracking not yet available - table access error'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: data || { message: 'Setup status updated successfully' }
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