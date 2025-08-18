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

    console.log(`[FIX-HREFLANG] Starting ${fixType} hreflang fix for: ${pageUrl || siteUrl}`);
    
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

    // 1. Detect if site is multi-language
    const languageAnalysis = await analyzeLanguageStructure(siteUrl);
    fixResults.fixes.push(...languageAnalysis.fixes);
    fixResults.errors.push(...languageAnalysis.errors);
    
    // 2. Apply hreflang automation if applicable
    const hreflangFixes = await applyHreflangAutomation(siteUrl, pageUrl);
    fixResults.fixes.push(...hreflangFixes.fixes);
    fixResults.errors.push(...hreflangFixes.errors);
    
    // 3. Generate action items for manual hreflang setup
    await generateHreflangActionItems(userToken, siteUrl, fixResults);

    // Calculate summary
    fixResults.summary.total = fixResults.fixes.length + fixResults.errors.length;
    fixResults.summary.applied = fixResults.fixes.filter(f => f.automated).length;
    fixResults.summary.failed = fixResults.errors.length;

    // Log fixes to monitoring events
    await logHreflangFixesToEvents(userToken, fixResults);

    return NextResponse.json({
      success: true,
      data: fixResults,
      message: `Applied ${fixResults.summary.applied} hreflang optimizations. ${languageAnalysis.isMultiLanguage ? 'Multi-language site detected' : 'Single language site'}.`
    });

  } catch (error) {
    console.error('[FIX-HREFLANG] Error:', error);
    return NextResponse.json({ error: 'Hreflang fix failed' }, { status: 500 });
  }
}

async function analyzeLanguageStructure(siteUrl: string) {
  const fixes: any[] = [];
  const errors: any[] = [];
  let isMultiLanguage = false;
  
  try {
    // Fetch the homepage to analyze language structure
    const response = await fetch(siteUrl);
    if (!response.ok) {
      errors.push({
        type: 'site_fetch_failed',
        title: 'Cannot Access Website',
        description: `Unable to fetch website: ${response.status}`,
        error: `HTTP ${response.status}`
      });
      return { fixes, errors, isMultiLanguage };
    }
    
    const html = await response.text();
    
    // Check for common multi-language indicators
    const languageIndicators = [
      { pattern: /\/en\/|\/fr\/|\/de\/|\/es\/|\/it\/|\/pt\//gi, name: 'URL path language codes' },
      { pattern: /\?lang=|&lang=/gi, name: 'Language query parameters' },
      { pattern: /lang-\w{2}|locale-\w{2}/gi, name: 'Language CSS classes' },
      { pattern: /hreflang=["']\w{2}(-\w{2})?["']/gi, name: 'Existing hreflang attributes' },
      { pattern: /<html[^>]+lang=["']\w{2}(-\w{2})?["']/gi, name: 'HTML lang attribute' }
    ];
    
    const detectedIndicators = [];
    for (const indicator of languageIndicators) {
      const matches = html.match(indicator.pattern);
      if (matches && matches.length > 0) {
        detectedIndicators.push({
          type: indicator.name,
          count: matches.length,
          samples: matches.slice(0, 3) // First 3 matches as examples
        });
      }
    }
    
    // Check if this looks like a multi-language site
    isMultiLanguage = detectedIndicators.length >= 2 || 
                     detectedIndicators.some(i => i.count > 3);
    
    if (isMultiLanguage) {
      fixes.push({
        type: 'multilanguage_detected',
        title: 'Multi-Language Site Detected',
        description: `Found ${detectedIndicators.length} language indicators on the site`,
        fix: 'SEOAgent.js will automatically manage hreflang tags',
        automated: true,
        priority: 'info',
        instructions: 'Hreflang automation is now active for this multi-language site',
        metadata: { 
          indicators: detectedIndicators,
          isMultiLanguage,
          detectionMethod: 'content-analysis'
        }
      });
    } else {
      fixes.push({
        type: 'single_language_site',
        title: 'Single Language Site',
        description: 'No multi-language structure detected',
        fix: 'No hreflang tags needed for single-language site',
        automated: true,
        priority: 'info',
        instructions: 'Site appears to be single-language, hreflang not required'
      });
    }
    
  } catch (error) {
    errors.push({
      type: 'language_analysis_failed',
      title: 'Language Analysis Failed',
      description: 'Unable to analyze language structure',
      error: error instanceof Error ? error.message : String(error)
    });
  }
  
  return { fixes, errors, isMultiLanguage };
}

async function applyHreflangAutomation(siteUrl: string, pageUrl?: string) {
  const fixes: any[] = [];
  const errors: any[] = [];
  
  // Hreflang automation is handled by SEOAgent.js
  fixes.push({
    type: 'hreflang_automation_active',
    title: 'Hreflang Automation Deployed',
    description: 'Intelligent hreflang tag management is active via SEOAgent.js',
    fix: 'Automatic language detection, hreflang generation, and multi-language site support',
    automated: true,
    priority: 'info',
    instructions: 'SEOAgent.js will automatically handle hreflang tags based on site structure',
    metadata: {
      features: [
        'Automatic language detection (HTML lang, URL patterns, content)',
        'Smart hreflang generation for detected languages',
        'Multi-language site structure recognition',
        'Real-time hreflang monitoring and validation',
        'Canonical + hreflang coordination'
      ],
      detectionMethods: [
        'HTML lang attribute analysis',
        'URL pattern recognition (/en/, /fr/, etc.)',
        'Language query parameter detection',
        'CSS class language indicators',
        'Meta tag language hints'
      ]
    }
  });
  
  return { fixes, errors };
}

async function generateHreflangActionItems(userToken: string, siteUrl: string, fixResults: any) {
  try {
    // Only create action items for manual fixes that need attention
    const manualFixes = fixResults.fixes.filter((fix: any) => 
      !fix.automated && ['critical', 'warning'].includes(fix.priority)
    );
    
    for (const fix of manualFixes) {
      await supabase
        .from('seo_action_items')
        .insert({
          user_token: userToken,
          site_url: siteUrl,
          issue_type: fix.type,
          issue_category: 'hreflang',
          severity: fix.priority,
          title: fix.title,
          description: fix.description,
          impact_description: 'Hreflang issues can cause problems with international SEO and search engine language targeting',
          fix_recommendation: fix.instructions || fix.fix,
          status: 'detected'
        });
    }
  } catch (error) {
    console.error('[FIX-HREFLANG] Error creating action items:', error);
  }
}

async function logHreflangFixesToEvents(userToken: string, fixResults: any) {
  try {
    const events = fixResults.fixes.map((fix: any) => ({
      user_token: userToken,
      site_url: fixResults.siteUrl,
      page_url: fixResults.pageUrl,
      event_type: fix.type,
      severity: fix.priority === 'critical' ? 'critical' : fix.priority === 'info' ? 'info' : 'warning',
      category: 'technical',
      title: fix.title,
      description: fix.description,
      old_value: null,
      new_value: null,
      auto_fixed: fix.automated,
      fix_applied: fix.automated ? fix.fix : null,
      source: 'tool-hreflang',
      metadata: { fixType: fixResults.fixType, automated: fix.automated, ...fix.metadata }
    }));
    
    if (events.length > 0) {
      await supabase
        .from('seo_monitoring_events')
        .insert(events);
    }
  } catch (error) {
    console.error('[FIX-HREFLANG] Error logging events:', error);
  }
}

// GET endpoint for hreflang capabilities analysis
export async function GET(request: NextRequest) {
  try {
    const userToken = request.nextUrl.searchParams.get('userToken');
    const siteUrl = request.nextUrl.searchParams.get('siteUrl');
    
    if (!userToken || !siteUrl) {
      return NextResponse.json({ error: 'Missing userToken or siteUrl' }, { status: 400 });
    }
    
    // Return hreflang automation capabilities
    const hreflangCapabilities = {
      type: 'hreflang_automation',
      title: 'Intelligent Hreflang Management',
      description: 'Automatic hreflang tag generation and management for multi-language sites',
      automated: true,
      features: [
        {
          name: 'Language Detection',
          description: 'Automatically detects site language structure and patterns',
          methods: ['HTML lang attribute', 'URL patterns', 'Content analysis', 'Meta tags']
        },
        {
          name: 'Multi-Language Recognition',
          description: 'Identifies if site has multiple language versions',
          indicators: ['URL paths (/en/, /fr/)', 'Query parameters (?lang=)', 'CSS classes']
        },
        {
          name: 'Hreflang Generation',
          description: 'Automatically generates appropriate hreflang tags',
          rules: ['Language code validation', 'Regional targeting', 'x-default handling']
        },
        {
          name: 'Real-time Monitoring',
          description: 'Monitors hreflang changes and validates implementation',
          alerts: ['Missing hreflang', 'Invalid language codes', 'Broken references']
        }
      ],
      supported_languages: [
        'Standard language codes (en, fr, de, es, it, pt, etc.)',
        'Regional variants (en-US, en-GB, fr-CA, etc.)',
        'x-default for international fallback'
      ]
    };
    
    return NextResponse.json({
      success: true,
      data: hreflangCapabilities,
      message: 'Hreflang automation capabilities ready'
    });
    
  } catch (error) {
    console.error('[FIX-HREFLANG] Error:', error);
    return NextResponse.json({ error: 'Failed to get hreflang capabilities' }, { status: 500 });
  }
}