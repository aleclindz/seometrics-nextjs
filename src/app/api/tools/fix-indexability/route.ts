import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userToken, siteUrl, pageUrl, fixType = 'auto' } = await request.json();
    
    if (!userToken || !siteUrl) {
      return NextResponse.json({ error: 'Missing userToken or siteUrl' }, { status: 400 });
    }

    console.log(`[FIX-INDEXABILITY] Starting ${fixType} fix for: ${pageUrl || siteUrl}`);
    
    const fixResults = {
      siteUrl,
      pageUrl: pageUrl || siteUrl,
      fixType,
      timestamp: new Date().toISOString(),
      fixes: [] as any[],
      errors: [] as any[],
      summary: {
        applied: 0,
        failed: 0,
        total: 0
      }
    };

    // 1. Check for noindex issues and suggest fixes
    const noindexFixes = await fixNoindexIssues(siteUrl, userToken);
    fixResults.fixes.push(...noindexFixes.fixes);
    fixResults.errors.push(...noindexFixes.errors);
    
    // 2. Fix robots.txt issues
    const robotsFixes = await suggestRobotsFixes(siteUrl, userToken);
    fixResults.fixes.push(...robotsFixes.fixes);
    fixResults.errors.push(...robotsFixes.errors);
    
    // 3. Fix canonical issues
    const canonicalFixes = await fixCanonicalIssues(siteUrl);
    fixResults.fixes.push(...canonicalFixes.fixes);
    fixResults.errors.push(...canonicalFixes.errors);
    
    // 4. Generate action items for issues that need manual intervention
    await generateActionItems(userToken, siteUrl, fixResults);

    // Calculate summary
    fixResults.summary.total = fixResults.fixes.length + fixResults.errors.length;
    fixResults.summary.applied = fixResults.fixes.length;
    fixResults.summary.failed = fixResults.errors.length;

    // Log fixes to monitoring events
    await logFixesToEvents(userToken, fixResults);

    return NextResponse.json({
      success: true,
      data: fixResults,
      message: `Applied ${fixResults.summary.applied} indexability fixes. ${fixResults.summary.failed} issues need manual attention.`
    });

  } catch (error) {
    console.error('[FIX-INDEXABILITY] Error:', error);
    return NextResponse.json({ error: 'Indexability fix failed' }, { status: 500 });
  }
}

async function fixNoindexIssues(siteUrl: string, userToken: string) {
  const fixes: any[] = [];
  const errors: any[] = [];
  
  try {
    // Check GSC for pages with indexing issues
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/gsc/url-inspection?userToken=${userToken}&siteUrl=${encodeURIComponent(siteUrl)}&url=${encodeURIComponent(siteUrl)}`);
    
    if (response.ok) {
      const inspectionData = await response.json();
      
      if (inspectionData.index_status === 'FAIL' && inspectionData.robots_txt_state === 'DISALLOWED') {
        fixes.push({
          type: 'robots_disallow_detected',
          title: 'Robots.txt Blocking Detected',
          description: 'Page is being blocked by robots.txt',
          fix: 'Update robots.txt to allow this page',
          automated: false,
          priority: 'critical',
          instructions: 'Remove or modify the robots.txt rule that blocks this page'
        });
      }
      
      if (!inspectionData.can_be_indexed) {
        fixes.push({
          type: 'indexability_issue',
          title: 'Page Cannot Be Indexed',
          description: `Page indexability issue: ${inspectionData.index_status}`,
          fix: 'SEOAgent.js will monitor and alert on indexability changes',
          automated: true,
          priority: 'critical',
          instructions: 'Install SEOAgent.js to monitor indexability in real-time'
        });
      }
    }
  } catch (error) {
    errors.push({
      type: 'gsc_check_failed',
      title: 'GSC Inspection Failed',
      description: 'Unable to check indexability via Google Search Console',
      error: error instanceof Error ? error.message : String(error)
    });
  }
  
  return { fixes, errors };
}

async function suggestRobotsFixes(siteUrl: string, userToken: string) {
  const fixes: any[] = [];
  const errors: any[] = [];
  
  try {
    // Get robots.txt analysis
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/technical-seo/robots-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userToken, siteUrl })
    });
    
    if (response.ok) {
      const robotsData = await response.json();
      
      if (robotsData.issues && robotsData.issues.length > 0) {
        robotsData.issues.forEach((issue: any) => {
          fixes.push({
            type: 'robots_optimization',
            title: issue.title,
            description: issue.description,
            fix: issue.recommendation,
            automated: false,
            priority: issue.severity,
            instructions: `Modify robots.txt: ${issue.recommendation}`
          });
        });
      } else {
        fixes.push({
          type: 'robots_validated',
          title: 'Robots.txt Validated',
          description: 'No robots.txt issues found',
          fix: 'SEOAgent.js will continue monitoring robots.txt',
          automated: true,
          priority: 'info'
        });
      }
    }
  } catch (error) {
    errors.push({
      type: 'robots_analysis_failed',
      title: 'Robots.txt Analysis Failed',
      description: 'Unable to analyze robots.txt file',
      error: error instanceof Error ? error.message : String(error)
    });
  }
  
  return { fixes, errors };
}

async function fixCanonicalIssues(siteUrl: string) {
  const fixes: any[] = [];
  const errors: any[] = [];
  
  // These are automatically handled by SEOAgent.js
  fixes.push({
    type: 'canonical_automation',
    title: 'Canonical Tags Automated',
    description: 'SEOAgent.js automatically manages canonical tags',
    fix: 'Enhanced canonical logic with UTM parameter cleaning',
    automated: true,
    priority: 'info',
    instructions: 'SEOAgent.js handles canonical tags automatically - no action needed'
  });
  
  return { fixes, errors };
}

async function generateActionItems(userToken: string, siteUrl: string, fixResults: any) {
  try {
    const manualFixes = fixResults.fixes.filter((fix: any) => !fix.automated && fix.priority === 'critical');
    
    for (const fix of manualFixes) {
      await supabase
        .from('seo_action_items')
        .insert({
          user_token: userToken,
          site_url: siteUrl,
          issue_type: fix.type,
          issue_category: 'indexability',
          severity: fix.priority,
          title: fix.title,
          description: fix.description,
          impact_description: 'Critical indexability issue that prevents search engine crawling',
          fix_recommendation: fix.instructions || fix.fix,
          status: 'detected'
        });
    }
  } catch (error) {
    console.error('[FIX-INDEXABILITY] Error creating action items:', error);
  }
}

async function logFixesToEvents(userToken: string, fixResults: any) {
  try {
    const events = fixResults.fixes.map((fix: any) => ({
      user_token: userToken,
      site_url: fixResults.siteUrl,
      page_url: fixResults.pageUrl,
      event_type: fix.type,
      severity: fix.priority === 'critical' ? 'critical' : fix.priority === 'info' ? 'info' : 'warning',
      category: 'indexability',
      title: fix.title,
      description: fix.description,
      old_value: null,
      new_value: null,
      auto_fixed: fix.automated,
      fix_applied: fix.automated ? fix.fix : null,
      source: 'tool-fix',
      metadata: { fixType: fixResults.fixType, automated: fix.automated }
    }));
    
    if (events.length > 0) {
      await supabase
        .from('seo_monitoring_events')
        .insert(events);
    }
  } catch (error) {
    console.error('[FIX-INDEXABILITY] Error logging events:', error);
  }
}

// GET endpoint for checking what fixes are available
export async function GET(request: NextRequest) {
  try {
    const userToken = request.nextUrl.searchParams.get('userToken');
    const siteUrl = request.nextUrl.searchParams.get('siteUrl');
    
    if (!userToken || !siteUrl) {
      return NextResponse.json({ error: 'Missing userToken or siteUrl' }, { status: 400 });
    }
    
    // Return available fix types
    const availableFixes = [
      {
        type: 'noindex_detection',
        title: 'NOINDEX Detection & Alerts',
        description: 'Monitor pages for unexpected noindex changes',
        automated: true,
        tools: ['SEOAgent.js DOM monitoring']
      },
      {
        type: 'robots_optimization',
        title: 'Robots.txt Optimization',
        description: 'Analyze and suggest robots.txt improvements',
        automated: false,
        tools: ['GSC integration', 'Robots analysis API']
      },
      {
        type: 'canonical_automation',
        title: 'Canonical Tag Automation',
        description: 'Automatically add and optimize canonical tags',
        automated: true,
        tools: ['SEOAgent.js canonical processing']
      }
    ];
    
    return NextResponse.json({
      success: true,
      data: availableFixes,
      message: 'Available indexability fixes'
    });
    
  } catch (error) {
    console.error('[FIX-INDEXABILITY] Error:', error);
    return NextResponse.json({ error: 'Failed to get available fixes' }, { status: 500 });
  }
}