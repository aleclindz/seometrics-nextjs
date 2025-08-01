import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RobotsAnalysis {
  exists: boolean;
  accessible: boolean;
  size: number;
  content: string;
  issues: Array<{
    type: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
    line?: number;
  }>;
  suggestions: Array<{
    type: string;
    description: string;
    example?: string;
  }>;
  crawlDelay?: number;
  sitemapUrls: string[];
  userAgents: string[];
  allowedPaths: string[];
  disallowedPaths: string[];
}

function analyzeRobotsContent(content: string): Omit<RobotsAnalysis, 'exists' | 'accessible' | 'size' | 'content'> {
  const lines = content.split('\n').map(line => line.trim());
  const issues: RobotsAnalysis['issues'] = [];
  const suggestions: RobotsAnalysis['suggestions'] = [];
  
  let crawlDelay: number | undefined;
  const sitemapUrls: string[] = [];
  const userAgents: string[] = [];
  const allowedPaths: string[] = [];
  const disallowedPaths: string[] = [];
  
  let currentUserAgent = '';
  let hasUserAgent = false;
  let hasAnyDirectives = false;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) return;
    
    const [directive, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();
    
    if (!directive || !value) {
      issues.push({
        type: 'syntax_error',
        severity: 'warning',
        description: `Line ${lineNumber}: Invalid syntax - missing directive or value`,
        line: lineNumber
      });
      return;
    }
    
    const lowerDirective = directive.toLowerCase().trim();
    
    switch (lowerDirective) {
      case 'user-agent':
        hasUserAgent = true;
        currentUserAgent = value;
        userAgents.push(value);
        
        // Check for common user agent issues
        if (value === '*' && userAgents.filter(ua => ua === '*').length > 1) {
          issues.push({
            type: 'duplicate_wildcard',
            severity: 'warning',
            description: `Line ${lineNumber}: Multiple wildcard (*) user-agents detected`,
            line: lineNumber
          });
        }
        break;
        
      case 'disallow':
        hasAnyDirectives = true;
        if (!hasUserAgent) {
          issues.push({
            type: 'missing_user_agent',
            severity: 'critical',
            description: `Line ${lineNumber}: Disallow directive without preceding User-agent`,
            line: lineNumber
          });
        }
        
        disallowedPaths.push(value);
        
        // Check for common disallow issues
        if (value === '') {
          suggestions.push({
            type: 'empty_disallow',
            description: 'Empty Disallow directive allows all crawling for this user-agent'
          });
        }
        
        if (value === '/' && currentUserAgent === '*') {
          issues.push({
            type: 'blocks_all_crawling',
            severity: 'critical',
            description: `Line ${lineNumber}: Disallow: / with User-agent: * blocks all search engine crawling`,
            line: lineNumber
          });
        }
        
        // Check for sitemap blocking
        if (value.includes('sitemap') || value.includes('.xml')) {
          issues.push({
            type: 'blocks_sitemap',
            severity: 'warning',
            description: `Line ${lineNumber}: Disallowing sitemap or XML files may hurt SEO`,
            line: lineNumber
          });
        }
        break;
        
      case 'allow':
        hasAnyDirectives = true;
        if (!hasUserAgent) {
          issues.push({
            type: 'missing_user_agent',
            severity: 'critical',
            description: `Line ${lineNumber}: Allow directive without preceding User-agent`,
            line: lineNumber
          });
        }
        
        allowedPaths.push(value);
        break;
        
      case 'crawl-delay':
        const delay = parseInt(value);
        if (isNaN(delay)) {
          issues.push({
            type: 'invalid_crawl_delay',
            severity: 'warning',
            description: `Line ${lineNumber}: Invalid crawl-delay value - must be a number`,
            line: lineNumber
          });
        } else {
          crawlDelay = delay;
          
          if (delay > 10) {
            issues.push({
              type: 'high_crawl_delay',
              severity: 'warning',
              description: `Line ${lineNumber}: High crawl-delay (${delay}s) may slow indexing`,
              line: lineNumber
            });
          }
        }
        break;
        
      case 'sitemap':
        sitemapUrls.push(value);
        
        // Validate sitemap URL
        try {
          new URL(value);
        } catch {
          issues.push({
            type: 'invalid_sitemap_url',
            severity: 'warning',
            description: `Line ${lineNumber}: Invalid sitemap URL format`,
            line: lineNumber
          });
        }
        break;
        
      default:
        issues.push({
          type: 'unknown_directive',
          severity: 'info',
          description: `Line ${lineNumber}: Unknown directive "${directive}" - may be ignored by crawlers`,
          line: lineNumber
        });
    }
  });
  
  // Global validation checks
  if (!hasUserAgent) {
    issues.push({
      type: 'no_user_agent',
      severity: 'critical',
      description: 'No User-agent directives found - robots.txt may not work as expected'
    });
  }
  
  if (!hasAnyDirectives && hasUserAgent) {
    suggestions.push({
      type: 'no_directives',
      description: 'Consider adding Allow or Disallow directives to control crawling behavior'
    });
  }
  
  if (sitemapUrls.length === 0) {
    suggestions.push({
      type: 'add_sitemap',
      description: 'Consider adding Sitemap directive to help search engines discover your sitemap',
      example: 'Sitemap: https://yourdomain.com/sitemap.xml'
    });
  }
  
  // Check for SEO best practices
  if (!userAgents.includes('*')) {
    suggestions.push({
      type: 'add_wildcard_user_agent',
      description: 'Consider adding "User-agent: *" to set default rules for all crawlers'
    });
  }
  
  return {
    issues,
    suggestions,
    crawlDelay,
    sitemapUrls,
    userAgents,
    allowedPaths,
    disallowedPaths
  };
}

export async function POST(request: NextRequest) {
  try {
    const { userToken, siteUrl } = await request.json();
    
    if (!userToken || !siteUrl) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }
    
    console.log('[ROBOTS ANALYSIS] Starting analysis for:', siteUrl);
    
    // Get user ID from user_token  
    const { data: userData, error: userError } = await supabase
      .from('login_users')
      .select('id, email, auth_user_id')
      .eq('token', userToken)
      .single();
    
    if (userError || !userData) {
      return NextResponse.json({ 
        error: 'Invalid user token' 
      }, { status: 401 });
    }
    
    // Construct robots.txt URL
    const robotsUrl = new URL('/robots.txt', siteUrl).toString();
    console.log('[ROBOTS ANALYSIS] Fetching robots.txt from:', robotsUrl);
    
    let analysis: RobotsAnalysis;
    
    try {
      // Fetch robots.txt with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(robotsUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'SEOAgent-Bot/1.0 (+https://seoagent.com/bot)'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const content = await response.text();
        const contentAnalysis = analyzeRobotsContent(content);
        
        analysis = {
          exists: true,
          accessible: true,
          size: content.length,
          content: content,
          ...contentAnalysis
        };
        
        console.log('[ROBOTS ANALYSIS] Successfully analyzed robots.txt');
      } else {
        // robots.txt doesn't exist or not accessible
        analysis = {
          exists: false,
          accessible: false,
          size: 0,
          content: '',
          issues: [{
            type: 'robots_not_found',
            severity: 'warning',
            description: `robots.txt not found at ${robotsUrl} (HTTP ${response.status})`
          }],
          suggestions: [{
            type: 'create_robots',
            description: 'Consider creating a robots.txt file to control search engine crawling',
            example: 'User-agent: *\nDisallow: /admin/\nDisallow: /private/\nSitemap: https://yourdomain.com/sitemap.xml'
          }],
          sitemapUrls: [],
          userAgents: [],
          allowedPaths: [],
          disallowedPaths: []
        };
        
        console.log('[ROBOTS ANALYSIS] robots.txt not found or not accessible');
      }
    } catch (error) {
      console.error('[ROBOTS ANALYSIS] Fetch error:', error);
      
      analysis = {
        exists: false,
        accessible: false,
        size: 0,
        content: '',
        issues: [{
          type: 'fetch_error',
          severity: 'warning',
          description: 'Unable to fetch robots.txt - network error or timeout'
        }],
        suggestions: [{
          type: 'check_robots_accessibility',
          description: 'Ensure robots.txt is accessible and your server is responding properly'
        }],
        sitemapUrls: [],
        userAgents: [],
        allowedPaths: [],
        disallowedPaths: []
      };
    }
    
    // Store analysis results in database
    // Note: Looking at the database schema, we need to make sure the user_token field exists
    // For consistency with other tables, let me add both user_id and user_token
    const { error: insertError } = await supabase
      .from('robots_analyses')
      .upsert({
        user_id: userData.id,
        user_token: userToken,
        site_url: siteUrl,
        exists: analysis.exists,
        accessible: analysis.accessible,
        size: analysis.size,
        content: analysis.content,
        issues: analysis.issues,
        suggestions: analysis.suggestions,
        crawl_delay: analysis.crawlDelay,
        sitemap_urls: analysis.sitemapUrls,
        user_agents: analysis.userAgents,
        allowed_paths: analysis.allowedPaths,
        disallowed_paths: analysis.disallowedPaths,
        analyzed_at: new Date().toISOString()
      }, {
        onConflict: 'user_token,site_url'
      });
    
    if (insertError) {
      console.error('[ROBOTS ANALYSIS] Database insert error:', insertError);
    } else {
      console.log('[ROBOTS ANALYSIS] Results stored in database');
    }
    
    return NextResponse.json({
      success: true,
      data: analysis
    });
    
  } catch (error) {
    console.error('[ROBOTS ANALYSIS] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}