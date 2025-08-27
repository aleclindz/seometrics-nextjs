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
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Fallback: Check setup status manually since database functions may not exist yet
    console.log('[SETUP STATUS] Checking setup status for:', domain);
    
    try {
      // Check if the table exists first
      const { data: tableCheck, error: tableError } = await supabase
        .from('website_setup_status')
        .select('*')
        .eq('user_token', userToken)
        .eq('domain', domain)
        .limit(1);

      if (tableError && tableError.code === '42P01') {
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

      if (tableError) {
        console.error('Error accessing setup status table:', tableError);
        throw tableError;
      }

      if (tableCheck && tableCheck.length > 0) {
        const record = tableCheck[0];
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

    // Fallback: Manual upsert since database functions may not exist yet
    let data;
    try {
      // Check if table exists and if record already exists
      const { data: existingRecord, error: selectError } = await supabase
        .from('website_setup_status')
        .select('*')
        .eq('user_token', userToken)
        .eq('domain', domain)
        .single();

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
        // Update existing record
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
          .eq('domain', domain)
          .select()
          .single();
        
        data = updateResult.data;
        error = updateResult.error;
      } else {
        // Insert new record
        const insertResult = await supabase
          .from('website_setup_status')
          .insert({
            user_token: userToken,
            domain: domain,
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

    // Update setup preferences
    const { data, error } = await supabase
      .from('website_setup_status')
      .upsert({
        user_token: userToken,
        domain: domain,
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