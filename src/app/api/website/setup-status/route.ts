import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DomainQueryService } from '@/lib/database/DomainQueryService';
import { DomainUtils } from '@/lib/utils/DomainUtils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to detect SEOAgent.js status
async function detectSEOAgentStatus(domain: string, cleanedDomain?: string): Promise<string> {
  try {
    // Use cleaned_domain if available, otherwise use DomainUtils
    const cleanDomain = cleanedDomain || DomainUtils.cleanDomain(domain);
    
    // Build proper website URL
    const websiteUrl = DomainUtils.buildUrl(cleanDomain);
    console.log(`[SETUP STATUS] Checking SEOAgent.js installation on: ${websiteUrl}`);
    
    // Fetch the website HTML to check for script tag
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'SEOAgent-Setup-Check/1.0 (+https://seoagent.com/setup-status)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`[SETUP STATUS] Failed to fetch ${websiteUrl}: HTTP ${response.status}`);
      return 'inactive';
    }
    
    const html = await response.text();
    
    // Check for SEOAgent.js script tag (either local or external from seoagent.com)
    const seoAgentRegex = /<script[^>]*src\s*=\s*['"](.*?seoagent\.js.*?)['"][^>]*>/i;
    const seoAgentMatch = html.match(seoAgentRegex);
    
    // Check for IDV configuration
    const idvRegex = /const\s+idv\s*=\s*['"`]([^'"`]+)['"`]/i;
    const idvMatch = html.match(idvRegex);
    
    const hasScript = !!seoAgentMatch;
    const hasIdv = !!idvMatch;
    const isActive = hasScript && hasIdv;
    
    console.log(`[SETUP STATUS] SEOAgent.js detection for ${cleanDomain}:`, {
      hasScript,
      hasIdv,
      isActive,
      scriptSrc: seoAgentMatch?.[1] || 'none',
      idvToken: idvMatch?.[1] || 'none'
    });
    
    return isActive ? 'active' : 'inactive';
  } catch (error) {
    console.log(`[SETUP STATUS] SEOAgent.js detection failed for ${domain}:`, error);
    return 'inactive';
  }
}

// Helper function to check CMS connections
async function checkCMSStatus(userToken: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('cms_connections')
      .select('id')
      .eq('user_token', userToken)
      .eq('is_active', true)
      .limit(1);
    
    if (error) {
      console.log('[SETUP STATUS] CMS connections table not accessible:', error);
      return 'none';
    }
    
    return data && data.length > 0 ? 'connected' : 'none';
  } catch (error) {
    console.log('[SETUP STATUS] Error checking CMS status:', error);
    return 'none';
  }
}

// Helper function to check hosting connections
async function checkHostingStatus(userToken: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('host_connections')
      .select('deployment_status')
      .eq('user_token', userToken)
      .limit(10); // Get up to 10 connections to check their statuses
    
    if (error) {
      console.log('[SETUP STATUS] Host connections table not accessible:', error);
      return 'none';
    }
    
    // Check if any connection has an active deployment
    const hasActiveDeployment = data && data.some((conn: any) => 
      conn.deployment_status === 'active'
    );
    
    return hasActiveDeployment ? 'connected' : 'none';
  } catch (error) {
    console.log('[SETUP STATUS] Error checking hosting status:', error);
    return 'none';
  }
}

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
    // Note: Check both host_status and hosting_status for compatibility
    // Include cleaned_domain for proper URL construction
    const websiteResult = await DomainQueryService.queryTableByDomain(
      'websites',
      userToken, 
      domain,
      'gsc_status, seoagentjs_status, cms_status, host_status, hosting_status, last_status_check, domain, cleaned_domain'
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
    
    // Check if we need to refresh status (older than 1 hour or forced refresh)
    const lastCheck = website.last_status_check ? new Date(website.last_status_check) : null;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const needsRefresh = forceRefresh || !lastCheck || lastCheck < oneHourAgo;

    let gscStatus = website.gsc_status;
    let seoagentjsStatus = website.seoagentjs_status;
    let cmsStatus = website.cms_status;
    // Use hosting_status if available, otherwise fall back to host_status
    let hostingStatus = website.hosting_status || website.host_status;

    if (needsRefresh) {
      console.log('[SETUP STATUS] Refreshing connection statuses...');
      
      // Refresh GSC status by checking gsc_connections table
      const { data: gscConnection, error: gscError } = await supabase
        .from('gsc_connections')
        .select('id, is_active')
        .eq('user_token', userToken)
        .eq('is_active', true)
        .limit(1);

      if (!gscError && gscConnection && gscConnection.length > 0) {
        gscStatus = 'connected';
      } else {
        gscStatus = 'none';
      }

      // Refresh SEOAgent.js status by checking if script is accessible
      // Use cleaned_domain to avoid sc-domain: prefix issues
      seoagentjsStatus = await detectSEOAgentStatus(website.domain, website.cleaned_domain);
      
      // Refresh CMS status
      cmsStatus = await checkCMSStatus(userToken);
      
      // Refresh hosting status  
      hostingStatus = await checkHostingStatus(userToken);

      // Update the website record with refreshed statuses
      try {
        // Update both hosting columns if they exist to maintain compatibility
        const updateData: any = {
          gsc_status: gscStatus,
          seoagentjs_status: seoagentjsStatus,
          cms_status: cmsStatus,
          last_status_check: new Date().toISOString()
        };
        
        // Update the appropriate hosting column
        if (website.hosting_status !== undefined) {
          updateData.hosting_status = hostingStatus;
        }
        if (website.host_status !== undefined) {
          updateData.host_status = hostingStatus;
        }
        
        await supabase
          .from('websites')
          .update(updateData)
          .eq('user_token', userToken)
          .eq('domain', website.domain);
          
        console.log('[SETUP STATUS] Updated connection statuses:', {
          domain: website.domain,
          gscStatus,
          seoagentjsStatus,
          cmsStatus,
          hostingStatus
        });
      } catch (updateError) {
        console.error('[SETUP STATUS] Failed to update connection statuses:', updateError);
        // Continue with detected values even if update fails
      }
    }

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
        refreshed: needsRefresh
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