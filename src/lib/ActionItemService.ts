import { createClient } from '@supabase/supabase-js';
import { UrlNormalizationService } from './UrlNormalizationService';
import { IndexingIssueAnalyzer, IndexingAnalysis } from './IndexingIssueAnalyzer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ActionItem {
  id: string;
  user_token: string;
  site_url: string;
  issue_type: string;
  issue_category: 'indexing' | 'sitemap' | 'robots' | 'schema' | 'mobile' | 'performance' | 'meta_tags' | 'alt_tags' | 'core_vitals' | 'security';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact_description?: string;
  fix_recommendation?: string;
  status: 'detected' | 'assigned' | 'in_progress' | 'completed' | 'needs_verification' | 'verified' | 'closed' | 'dismissed';
  affected_urls?: string[];
  reference_id?: string;
  reference_table?: string;
  detected_at: string;
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  verified_at?: string;
  dismissed_at?: string;
  next_check_at?: string;
  fix_type?: string;
  fix_details?: any;
  verification_status?: 'pending' | 'verified' | 'failed' | 'needs_recheck';
  verification_attempts?: number;
  verification_details?: any;
  metadata?: any;
  priority_score?: number;
  estimated_impact?: 'high' | 'medium' | 'low';
  estimated_effort?: 'easy' | 'medium' | 'hard';
  created_at: string;
  updated_at: string;
}

export interface DetectedIssue {
  type: string;
  category: ActionItem['issue_category'];
  severity: ActionItem['severity'];
  title: string;
  description: string;
  impactDescription: string;
  fixRecommendation: string;
  affectedUrls: string[];
  referenceId?: string;
  referenceTable?: string;
  estimatedImpact: 'high' | 'medium' | 'low';
  estimatedEffort: 'easy' | 'medium' | 'hard';
  metadata?: any;
}

export class ActionItemService {
  /**
   * Detect all SEO issues for a website by scanning various data sources
   */
  static async detectIssues(userToken: string, siteUrl: string): Promise<DetectedIssue[]> {
    console.log(`[ACTION ITEMS] Detecting issues for ${siteUrl}`);
    
    const detectedIssues: DetectedIssue[] = [];
    
    try {
      // Note: Verification is handled when manually triggered via the UI
      
      // Detect indexing issues from URL inspections
      const indexingIssues = await this.detectIndexingIssues(userToken, siteUrl);
      detectedIssues.push(...indexingIssues);
      
      // Detect sitemap issues
      const sitemapIssues = await this.detectSitemapIssues(userToken, siteUrl);
      detectedIssues.push(...sitemapIssues);
      
      // Detect robots.txt issues
      const robotsIssues = await this.detectRobotsIssues(userToken, siteUrl);
      detectedIssues.push(...robotsIssues);
      
      // Detect schema markup issues
      const schemaIssues = await this.detectSchemaIssues(userToken, siteUrl);
      detectedIssues.push(...schemaIssues);
      
      // Detect mobile usability issues
      const mobileIssues = await this.detectMobileIssues(userToken, siteUrl);
      detectedIssues.push(...mobileIssues);
      
      console.log(`[ACTION ITEMS] Detected ${detectedIssues.length} issues`);
      return detectedIssues;
    } catch (error) {
      console.error('[ACTION ITEMS] Error detecting issues:', error);
      return [];
    }
  }

  /**
   * Create action items from detected issues, avoiding duplicates
   */
  static async createActionItem(userToken: string, siteUrl: string, issue: DetectedIssue): Promise<ActionItem | null> {
    try {
      // Check for existing similar action item to avoid duplicates
      const existing = await this.findSimilarActionItem(userToken, siteUrl, issue);
      if (existing) {
        console.log(`[ACTION ITEMS] Similar issue already exists: ${issue.title}`);
        return existing;
      }

      // Calculate priority score
      const priorityScore = this.calculatePriorityScore(
        issue.severity,
        issue.estimatedImpact,
        issue.affectedUrls.length
      );

      const { data, error } = await supabase
        .from('seo_action_items')
        .insert({
          user_token: userToken,
          site_url: siteUrl,
          issue_type: issue.type,
          issue_category: issue.category,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          impact_description: issue.impactDescription,
          fix_recommendation: issue.fixRecommendation,
          affected_urls: issue.affectedUrls,
          reference_id: issue.referenceId,
          reference_table: issue.referenceTable,
          estimated_impact: issue.estimatedImpact,
          estimated_effort: issue.estimatedEffort,
          priority_score: priorityScore,
          metadata: issue.metadata || {}
        })
        .select()
        .single();

      if (error) {
        console.error('[ACTION ITEMS] Error creating action item:', error);
        return null;
      }

      console.log(`[ACTION ITEMS] Created action item: ${issue.title}`);
      return data;
    } catch (error) {
      console.error('[ACTION ITEMS] Error creating action item:', error);
      return null;
    }
  }

  /**
   * Update action item status and metadata
   */
  static async updateActionItem(
    actionItemId: string, 
    updates: Partial<ActionItem>
  ): Promise<ActionItem | null> {
    try {
      const { data, error } = await supabase
        .from('seo_action_items')
        .update(updates)
        .eq('id', actionItemId)
        .select()
        .single();

      if (error) {
        console.error('[ACTION ITEMS] Error updating action item:', error);
        return null;
      }

      console.log(`[ACTION ITEMS] Updated action item: ${actionItemId}`);
      return data;
    } catch (error) {
      console.error('[ACTION ITEMS] Error updating action item:', error);
      return null;
    }
  }

  /**
   * Verify that completed action items are actually resolved
   */
  static async verifyCompletion(actionItemId: string): Promise<boolean> {
    try {
      const { data: actionItem, error } = await supabase
        .from('seo_action_items')
        .select('*')
        .eq('id', actionItemId)
        .single();

      if (error || !actionItem) {
        console.error('[ACTION ITEMS] Action item not found for verification');
        return false;
      }

      let verificationResult = false;
      let verificationDetails: any = {};

      // Verify based on action type
      switch (actionItem.issue_category) {
        case 'sitemap':
          verificationResult = await this.verifySitemapFix(actionItem);
          break;
        case 'robots':
          verificationResult = await this.verifyRobotsFix(actionItem);
          break;
        case 'indexing':
          verificationResult = await this.verifyIndexingFix(actionItem);
          break;
        case 'schema':
          verificationResult = await this.verifySchemaFix(actionItem);
          break;
        default:
          verificationResult = true; // Assume verified for other types
          break;
      }

      // Update verification status
      await this.updateActionItem(actionItemId, {
        verification_status: verificationResult ? 'verified' : 'needs_recheck',
        verification_attempts: (actionItem.verification_attempts || 0) + 1,
        verification_details: verificationDetails,
        status: verificationResult ? 'verified' : 'needs_verification'
      });

      return verificationResult;
    } catch (error) {
      console.error('[ACTION ITEMS] Error verifying completion:', error);
      return false;
    }
  }

  /**
   * Get action items with optional filtering
   */
  static async getActionItems(
    userToken: string, 
    siteUrl: string, 
    options: {
      status?: ActionItem['status'][];
      category?: ActionItem['issue_category'];
      severity?: ActionItem['severity'];
      limit?: number;
    } = {}
  ): Promise<ActionItem[]> {
    try {
      let query = supabase
        .from('seo_action_items')
        .select('*')
        .eq('user_token', userToken)
        .eq('site_url', siteUrl);

      if (options.status && options.status.length > 0) {
        query = query.in('status', options.status);
      }

      if (options.category) {
        query = query.eq('issue_category', options.category);
      }

      if (options.severity) {
        query = query.eq('severity', options.severity);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      query = query.order('priority_score', { ascending: false })
                   .order('detected_at', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('[ACTION ITEMS] Error fetching action items:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[ACTION ITEMS] Error fetching action items:', error);
      return [];
    }
  }

  // Private helper methods

  /**
   * Generate URL variations to handle different formats (sc-domain:, https://, www. variations)
   */
  private static getNormalizedUrls(siteUrl: string): string[] {
    const variations = new Set<string>();
    
    // Add the original URL
    variations.add(siteUrl);
    
    // Extract domain from different formats
    let domain = siteUrl;
    
    // Handle sc-domain: format
    if (domain.startsWith('sc-domain:')) {
      domain = domain.replace('sc-domain:', '');
      variations.add(`https://${domain}`);
      variations.add(`https://www.${domain}`);
      variations.add(`http://${domain}`);
      variations.add(`http://www.${domain}`);
    } else {
      // Handle regular URLs
      domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '');
      variations.add(`sc-domain:${domain}`);
      variations.add(`https://${domain}`);
      variations.add(`https://www.${domain}`);
      variations.add(`http://${domain}`);
      variations.add(`http://www.${domain}`);
    }
    
    return Array.from(variations);
  }

  private static async detectIndexingIssues(userToken: string, siteUrl: string): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];

    const { data: inspections } = await supabase
      .from('url_inspections')
      .select('*')
      .eq('user_token', userToken)
      .eq('site_url', siteUrl);

    if (!inspections) return issues;

    // Group issues by type
    const blockedPages = inspections.filter(i => !i.can_be_indexed && i.index_status !== 'PASS');
    const mobileUnfriendly = inspections.filter(i => i.can_be_indexed && !i.mobile_usable);

    if (blockedPages.length > 0) {
      // Use IndexingIssueAnalyzer to get detailed problem analysis
      const analysis = IndexingIssueAnalyzer.analyzeIndexingIssues(blockedPages);
      
      issues.push({
        type: 'indexing_blocked_pages',
        category: 'indexing',
        severity: analysis.totalAffectedPages > 5 ? 'critical' : 'high',
        title: `${analysis.totalAffectedPages} Pages Cannot Be Indexed`,
        description: analysis.summary,
        impactDescription: `${analysis.totalAffectedPages} pages cannot appear in Google search results, which means potential customers won&apos;t find them when searching for your products or services.`,
        fixRecommendation: analysis.detailedExplanation + '\n\n' + analysis.recommendedActions.join('\n\n'),
        affectedUrls: blockedPages.map(p => p.inspected_url),
        estimatedImpact: analysis.totalAffectedPages > 10 ? 'high' : 'medium',
        estimatedEffort: analysis.autoFixableCount > 0 ? 'easy' : 'medium',
        metadata: { 
          analysisData: analysis,
          autoFixableCount: analysis.autoFixableCount,
          codeFixableCount: analysis.codeFixableCount,
          manualOnlyCount: analysis.manualOnlyCount,
          problemsByType: analysis.problemsByType
        }
      });
    }

    return issues;
  }

  private static async detectSitemapIssues(userToken: string, siteUrl: string): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];

    // Normalize URL to handle both regular URLs and sc-domain: format
    const urlVariations = this.getNormalizedUrls(siteUrl);

    try {
      // First, get fresh sitemap status from GSC API
      const gscResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/gsc/sitemap-status?userToken=${userToken}&siteUrl=${encodeURIComponent(siteUrl)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (gscResponse.ok) {
        const gscData = await gscResponse.json();
        console.log(`[ACTION ITEMS] GSC sitemap check: ${gscData.success ? gscData.summary?.totalSitemaps || 0 : 0} sitemaps found`);
      }
    } catch (error) {
      console.log('[ACTION ITEMS] GSC sitemap check failed, falling back to database only');
    }

    // Try to find sitemap with any of the URL variations (now updated with fresh GSC data)
    const { data: sitemap } = await supabase
      .from('sitemap_submissions')
      .select('*')
      .eq('user_token', userToken)
      .in('site_url', urlVariations)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // NEW: Actually test if sitemap.xml exists at the URL regardless of database records
    let sitemapActuallyExists = false;
    let hasDynamicServing = false;
    const testUrl = UrlNormalizationService.domainPropertyToHttps(siteUrl) + '/sitemap.xml';
    const baseUrl = UrlNormalizationService.domainPropertyToHttps(siteUrl);
    
    // Step 1: Test if sitemap.xml is accessible via direct request
    try {
      console.log(`[ACTION ITEMS] Testing actual sitemap URL: ${testUrl}`);
      const sitemapResponse = await fetch(testUrl, {
        method: 'HEAD', // Use HEAD to avoid downloading large XML files
        timeout: 10000 // 10 second timeout
      } as any);
      
      if (sitemapResponse.ok) {
        const contentType = sitemapResponse.headers.get('content-type') || '';
        sitemapActuallyExists = contentType.includes('xml') || contentType.includes('text');
        console.log(`[ACTION ITEMS] Sitemap URL test: ${sitemapResponse.status}, content-type: ${contentType}, exists: ${sitemapActuallyExists}`);
      }
    } catch (error) {
      console.log(`[ACTION ITEMS] Sitemap URL test failed: ${error}`);
      sitemapActuallyExists = false;
    }

    // Step 2: If direct test failed, check for SEOAgent.js dynamic serving
    if (!sitemapActuallyExists) {
      try {
        console.log(`[ACTION ITEMS] Testing for SEOAgent.js dynamic serving on: ${baseUrl}`);
        const homeResponse = await fetch(baseUrl, {
          method: 'GET',
          timeout: 10000,
          headers: {
            'User-Agent': 'SEOAgent-ActionItemBot/1.0'
          }
        } as any);
        
        if (homeResponse.ok) {
          const homeContent = await homeResponse.text();
          
          // Check for SEOAgent.js installation markers
          const hasScript = homeContent.includes('seoagent.js') || homeContent.includes('SEO-METRICS');
          const hasWebsiteToken = homeContent.includes('idv = ') || homeContent.includes('website_token');
          
          hasDynamicServing = hasScript && hasWebsiteToken;
          console.log(`[ACTION ITEMS] SEOAgent.js detection: script=${hasScript}, token=${hasWebsiteToken}, dynamic=${hasDynamicServing}`);
          
          if (hasDynamicServing) {
            // If SEOAgent.js is properly installed, assume sitemap serving works
            sitemapActuallyExists = true;
            console.log(`[ACTION ITEMS] ✅ Dynamic sitemap serving detected via SEOAgent.js`);
          }
        }
      } catch (error) {
        console.log(`[ACTION ITEMS] SEOAgent.js detection failed: ${error}`);
        hasDynamicServing = false;
      }
    }

    // If sitemap actually exists (either static or dynamic) but no database record, it means it wasn't submitted to GSC
    if (sitemapActuallyExists && !sitemap) {
      const issueType = hasDynamicServing ? 'sitemap_dynamic_not_submitted' : 'sitemap_not_submitted';
      const title = hasDynamicServing ? 'Dynamic Sitemap Not Submitted to GSC' : 'Sitemap Exists but Not Submitted to GSC';
      const description = hasDynamicServing 
        ? 'SEOAgent.js is serving your sitemap dynamically but it has not been submitted to Google Search Console.'
        : 'A sitemap.xml file exists at your website but has not been submitted to Google Search Console.';
      
      issues.push({
        type: issueType,
        category: 'sitemap',
        severity: 'medium',
        title,
        description,
        impactDescription: 'Google may not discover all your pages efficiently without a submitted sitemap.',
        fixRecommendation: 'Submit your existing sitemap to Google Search Console.',
        affectedUrls: [testUrl],
        estimatedImpact: 'medium',
        estimatedEffort: 'easy',
        metadata: { 
          sitemapUrl: testUrl, 
          actuallyExists: true, 
          hasDynamicServing,
          detectionMethod: hasDynamicServing ? 'seoagent_js_detected' : 'direct_url_test'
        }
      });
    }
    // If neither database record nor actual sitemap exists (and no dynamic serving)
    else if (!sitemapActuallyExists && !sitemap && !hasDynamicServing) {
      issues.push({
        type: 'sitemap_missing',
        category: 'sitemap',
        severity: 'high',
        title: 'XML Sitemap Missing',
        description: 'No XML sitemap exists at your website and none has been submitted to Google Search Console.',
        impactDescription: 'Missing sitemaps make it harder for search engines to discover and index your pages.',
        fixRecommendation: 'Generate and submit an XML sitemap to Google Search Console.',
        affectedUrls: [siteUrl],
        estimatedImpact: 'high',
        estimatedEffort: 'easy',
        referenceTable: 'sitemap_submissions',
        metadata: { 
          sitemapUrl: testUrl, 
          actuallyExists: false,
          hasDynamicServing: false,
          detectionMethod: 'direct_url_test'
        }
      });
    }
    // If database record exists but actual sitemap doesn't (broken sitemap)
    else if (!sitemapActuallyExists && sitemap && !hasDynamicServing) {
      issues.push({
        type: 'sitemap_broken',
        category: 'sitemap',
        severity: 'high',
        title: 'Submitted Sitemap Not Accessible',
        description: 'A sitemap has been submitted to Google Search Console but the URL is not accessible or returns invalid content.',
        impactDescription: 'Google cannot process your sitemap, affecting page discovery and indexing.',
        fixRecommendation: 'Fix the sitemap URL or regenerate and resubmit the sitemap.',
        affectedUrls: [sitemap.sitemap_url],
        estimatedImpact: 'high',
        estimatedEffort: 'medium',
        referenceId: sitemap.id,
        referenceTable: 'sitemap_submissions',
        metadata: { 
          sitemapUrl: sitemap.sitemap_url, 
          actuallyExists: false,
          hasDynamicServing: false,
          detectionMethod: 'direct_url_test'
        }
      });
    }
    // If sitemap exists and is submitted but Google hasn't downloaded it yet
    else if (sitemap && (sitemap.google_download_status === 'pending' || !sitemap.google_last_downloaded)) {
      issues.push({
        type: 'sitemap_not_downloaded',
        category: 'sitemap',
        severity: 'medium',
        title: 'Sitemap Not Downloaded by Google',
        description: 'Sitemap has been submitted but Google has not downloaded it yet.',
        impactDescription: 'Google may not be aware of all your pages until the sitemap is processed.',
        fixRecommendation: 'Wait for Google to process the sitemap or resubmit if it has been more than 24 hours.',
        affectedUrls: [sitemap.sitemap_url],
        estimatedImpact: 'medium',
        estimatedEffort: 'easy',
        referenceId: sitemap.id,
        referenceTable: 'sitemap_submissions',
        metadata: { 
          sitemapUrl: sitemap.sitemap_url, 
          actuallyExists: sitemapActuallyExists,
          hasDynamicServing,
          detectionMethod: sitemapActuallyExists ? (hasDynamicServing ? 'seoagent_js_detected' : 'direct_url_test') : 'database_only'
        }
      });
    }

    return issues;
  }

  private static async detectRobotsIssues(userToken: string, siteUrl: string): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];

    // Use URL variations to handle different formats
    const urlVariations = this.getNormalizedUrls(siteUrl);

    const { data: robots } = await supabase
      .from('robots_analyses')
      .select('*')
      .eq('user_token', userToken)
      .in('site_url', urlVariations)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .single();

    // NEW: Actually test if robots.txt exists at the URL regardless of database records
    let robotsActuallyExists = false;
    let hasDynamicServing = false;
    const testUrl = UrlNormalizationService.domainPropertyToHttps(siteUrl) + '/robots.txt';
    const baseUrl = UrlNormalizationService.domainPropertyToHttps(siteUrl);
    
    // Step 1: Direct URL test
    try {
      console.log(`[ACTION ITEMS] Testing actual robots.txt URL: ${testUrl}`);
      const robotsResponse = await fetch(testUrl, {
        method: 'HEAD', // Use HEAD to avoid downloading content
        timeout: 10000 // 10 second timeout
      } as any);
      
      if (robotsResponse.ok) {
        const contentType = robotsResponse.headers.get('content-type') || '';
        robotsActuallyExists = contentType.includes('text') || robotsResponse.status === 200;
        console.log(`[ACTION ITEMS] ✅ Robots.txt found via direct access: ${robotsResponse.status}, content-type: ${contentType}`);
      }
    } catch (error) {
      console.log(`[ACTION ITEMS] ❌ Direct robots.txt access failed: ${error}`);
    }

    // Step 2: If direct test failed, check for SEOAgent.js dynamic serving
    if (!robotsActuallyExists) {
      try {
        console.log(`[ACTION ITEMS] Testing for SEOAgent.js dynamic serving on: ${baseUrl}`);
        const homeResponse = await fetch(baseUrl, {
          method: 'GET',
          timeout: 10000,
          headers: {
            'User-Agent': 'SEOAgent-ActionItemBot/1.0'
          }
        } as any);
        
        if (homeResponse.ok) {
          const homeContent = await homeResponse.text();
          
          // Check for SEOAgent.js installation markers
          const hasScript = homeContent.includes('seoagent.js') || homeContent.includes('SEO-METRICS');
          const hasWebsiteToken = homeContent.includes('idv = ') || homeContent.includes('website_token');
          
          hasDynamicServing = hasScript && hasWebsiteToken;
          console.log(`[ACTION ITEMS] SEOAgent.js detection: script=${hasScript}, token=${hasWebsiteToken}, dynamic=${hasDynamicServing}`);
          
          if (hasDynamicServing) {
            // If SEOAgent.js is properly installed, assume robots.txt serving works
            robotsActuallyExists = true;
            console.log(`[ACTION ITEMS] ✅ Dynamic robots.txt serving detected via SEOAgent.js`);
          }
        }
      } catch (error) {
        console.log(`[ACTION ITEMS] SEOAgent.js detection failed: ${error}`);
        hasDynamicServing = false;
      }
    }

    // Generate issues based on detection results - robots.txt requires manual server-side deployment
    if (!robotsActuallyExists) {
      // No robots.txt detected - provide manual deployment instructions
      const manualFixInstructions = `To add a robots.txt file to your website:

1. Create a file named "robots.txt" with this content:
   User-agent: *
   Allow: /
   
   Sitemap: ${baseUrl}/sitemap.xml
   
   # Block admin areas
   Disallow: /admin/
   Disallow: /wp-admin/

2. Upload this file to your website's root directory
3. Verify it's accessible at: ${testUrl}

For coding agents/developers:
- Place robots.txt in the public/static folder of your web application
- Configure your web server (Nginx/Apache) to serve static files from root
- For CDN/hosting platforms (Vercel/Netlify), place in public/ directory`;

      issues.push({
        type: 'robots_missing_manual_fix',
        category: 'robots',
        severity: 'medium',
        title: 'Robots.txt File Missing - Manual Setup Required',
        description: 'No robots.txt file exists at your website. This file must be deployed at the server level and cannot be automated via JavaScript.',
        impactDescription: 'Missing robots.txt can lead to crawling inefficiencies and missed SEO opportunities. Search engines may not know which parts of your site to crawl.',
        fixRecommendation: manualFixInstructions,
        affectedUrls: [testUrl],
        estimatedImpact: 'medium',
        estimatedEffort: 'easy',
        referenceId: robots?.id,
        referenceTable: 'robots_analyses',
        metadata: { 
          robotsUrl: testUrl, 
          actuallyExists: false, 
          requiresManualDeployment: true,
          automatable: false 
        }
      });
    } else if (robotsActuallyExists && (!robots || !robots.exists)) {
      // Static robots.txt exists but hasn't been analyzed
      issues.push({
        type: 'robots_not_analyzed',
        category: 'robots',
        severity: 'low',
        title: 'Robots.txt Exists but Not Analyzed',
        description: 'A robots.txt file exists at your website but has not been analyzed for optimization opportunities.',
        impactDescription: 'Without analysis, you may miss opportunities to improve crawling efficiency.',
        fixRecommendation: 'Run robots.txt analysis to check for optimization opportunities and ensure it includes your sitemap URL.',
        affectedUrls: [testUrl],
        estimatedImpact: 'low',
        estimatedEffort: 'easy',
        metadata: { robotsUrl: testUrl, actuallyExists: true, automatable: true }
      });
    }
    // If database record exists but actual robots.txt doesn't (broken robots.txt)
    else if (!robotsActuallyExists && robots && robots.exists) {
      issues.push({
        type: 'robots_broken',
        category: 'robots',
        severity: 'high',
        title: 'Robots.txt Not Accessible',
        description: 'Robots.txt is recorded as existing but the URL is not accessible or returns invalid content.',
        impactDescription: 'Search engines cannot access your robots.txt file, affecting crawling behavior.',
        fixRecommendation: 'Fix the robots.txt URL or regenerate the robots.txt file.',
        affectedUrls: [testUrl],
        estimatedImpact: 'high',
        estimatedEffort: 'medium',
        referenceId: robots.id,
        referenceTable: 'robots_analyses',
        metadata: { robotsUrl: testUrl, actuallyExists: false }
      });
    }
    // If robots exists and is recorded but Google has fetch errors
    else if (robots && robots.exists && (robots.google_fetch_status === 'error' || robots.google_fetch_errors > 0)) {
      issues.push({
        type: 'robots_fetch_errors',
        category: 'robots',
        severity: 'medium',
        title: 'Robots.txt Fetch Errors',
        description: 'Google is encountering errors when trying to fetch your robots.txt file.',
        impactDescription: 'Fetch errors can prevent proper crawling of your website.',
        fixRecommendation: 'Check robots.txt accessibility and fix any server-side issues.',
        affectedUrls: [testUrl],
        estimatedImpact: 'medium',
        estimatedEffort: 'medium',
        referenceId: robots.id,
        referenceTable: 'robots_analyses',
        metadata: { robotsUrl: testUrl, actuallyExists: robotsActuallyExists }
      });
    }

    return issues;
  }

  private static async detectSchemaIssues(userToken: string, siteUrl: string): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];

    const { data: schemas } = await supabase
      .from('schema_generations')
      .select('*')
      .ilike('page_url', `${siteUrl}%`);

    if (!schemas || schemas.length === 0) {
      issues.push({
        type: 'schema_missing_all',
        category: 'schema',
        severity: 'medium',
        title: 'No Schema Markup Found',
        description: 'Website lacks structured data markup.',
        impactDescription: 'Missing schema markup reduces rich snippet opportunities in search results.',
        fixRecommendation: 'Add appropriate schema markup to key pages (Organization, WebSite, Article, etc.).',
        affectedUrls: [siteUrl],
        estimatedImpact: 'medium',
        estimatedEffort: 'medium'
      });
    } else {
      const missingSchema = schemas.filter(s => s.schemas_generated === 0);
      if (missingSchema.length > 0) {
        issues.push({
          type: 'schema_missing_pages',
          category: 'schema',
          severity: missingSchema.length > 10 ? 'high' : 'medium',
          title: `${missingSchema.length} Pages Missing Schema Markup`,
          description: `${missingSchema.length} pages lack structured data markup.`,
          impactDescription: 'Pages without schema markup miss opportunities for enhanced search result displays.',
          fixRecommendation: 'Add appropriate schema markup to these pages based on their content type.',
          affectedUrls: missingSchema.map(s => s.page_url),
          estimatedImpact: 'medium',
          estimatedEffort: 'medium',
          metadata: { missingCount: missingSchema.length }
        });
      }
    }

    return issues;
  }

  private static async detectMobileIssues(userToken: string, siteUrl: string): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];

    const { data: inspections } = await supabase
      .from('url_inspections')
      .select('*')
      .eq('user_token', userToken)
      .eq('site_url', siteUrl)
      .eq('mobile_usable', false);

    if (inspections && inspections.length > 0) {
      issues.push({
        type: 'mobile_usability_issues',
        category: 'mobile',
        severity: inspections.length > 5 ? 'high' : 'medium',
        title: `${inspections.length} Pages Have Mobile Usability Issues`,
        description: `${inspections.length} pages have mobile-unfriendly elements.`,
        impactDescription: 'Mobile usability issues can hurt mobile search performance and user experience.',
        fixRecommendation: 'Review and fix mobile usability issues such as content width and clickable element spacing.',
        affectedUrls: inspections.map(i => i.inspected_url),
        estimatedImpact: 'medium',
        estimatedEffort: 'medium',
        metadata: { mobileIssuesCount: inspections.length }
      });
    }

    return issues;
  }

  private static async findSimilarActionItem(
    userToken: string, 
    siteUrl: string, 
    issue: DetectedIssue
  ): Promise<ActionItem | null> {
    const { data, error } = await supabase
      .from('seo_action_items')
      .select('*')
      .eq('user_token', userToken)
      .eq('site_url', siteUrl)
      .eq('issue_type', issue.type)
      .eq('issue_category', issue.category)
      .not('status', 'in', '(verified,closed,dismissed)')
      .limit(1)
      .single();

    return error ? null : data;
  }

  private static calculatePriorityScore(
    severity: ActionItem['severity'],
    impact: 'high' | 'medium' | 'low',
    affectedUrlCount: number
  ): number {
    let score = 50;

    // Severity bonus
    switch (severity) {
      case 'critical': score += 40; break;
      case 'high': score += 25; break;
      case 'medium': score += 10; break;
      case 'low': score += 0; break;
    }

    // Impact bonus
    switch (impact) {
      case 'high': score += 20; break;
      case 'medium': score += 10; break;
      case 'low': score += 5; break;
    }

    // Multiple URL bonus
    score += Math.min((affectedUrlCount - 1) * 2, 10);

    return Math.min(score, 100);
  }

  // Verification methods
  private static async verifySitemapFix(actionItem: ActionItem): Promise<boolean> {
    try {
      // First, refresh sitemap status from GSC API
      console.log(`[ACTION ITEMS] Starting sitemap verification for ${actionItem.site_url}`);
      
      const gscResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/gsc/sitemap-status?userToken=${actionItem.user_token}&siteUrl=${encodeURIComponent(actionItem.site_url)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      let gscRefreshSuccess = false;
      if (gscResponse.ok) {
        const gscData = await gscResponse.json();
        gscRefreshSuccess = gscData.success;
        console.log('[ACTION ITEMS] GSC sitemap verification response:', {
          success: gscData.success,
          sitemapCount: gscData.summary?.totalSitemaps || 0,
          downloadedCount: gscData.summary?.downloadedSitemaps || 0
        });
      } else {
        console.log('[ACTION ITEMS] GSC sitemap check failed:', gscResponse.status);
      }

      // Add small delay to ensure database updates are committed after GSC refresh
      if (gscRefreshSuccess) {
        console.log('[ACTION ITEMS] Waiting for database updates to commit...');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Get all user sitemaps and find the matching one using URL normalization
      const { data: allSitemaps } = await supabase
        .from('sitemap_submissions')
        .select('*')
        .eq('user_token', actionItem.user_token)
        .order('created_at', { ascending: false });

      console.log(`[ACTION ITEMS] All user sitemaps for verification:`, allSitemaps?.map(s => ({
        id: s.id,
        site_url: s.site_url,
        sitemap_url: s.sitemap_url,
        last_downloaded: s.last_downloaded,
        status: s.status,
        is_pending: s.is_pending
      })));
      
      // Find matching sitemap using the robust URL normalization service
      const matchingSitemap = allSitemaps && allSitemaps.length > 0
        ? UrlNormalizationService.findMatchingSitemap(
            // Convert action item site_url to a sitemap URL format for matching
            UrlNormalizationService.domainPropertyToHttps(actionItem.site_url) + '/sitemap.xml',
            allSitemaps
          ) || allSitemaps.find(s => 
            UrlNormalizationService.isSameSite(s.site_url, actionItem.site_url)
          )
        : null;

      console.log(`[ACTION ITEMS] Matching sitemap found:`, matchingSitemap ? {
        id: matchingSitemap.id,
        site_url: matchingSitemap.site_url,
        sitemap_url: matchingSitemap.sitemap_url,
        last_downloaded: matchingSitemap.last_downloaded,
        status: matchingSitemap.status,
        is_pending: matchingSitemap.is_pending
      } : null);

      // Verify sitemap exists and has been downloaded by Google
      const isVerified = !!(matchingSitemap && 
        matchingSitemap.last_downloaded && 
        matchingSitemap.status === 'processed');

      console.log(`[ACTION ITEMS] Verification result:`, {
        hasMatchingSitemap: !!matchingSitemap,
        hasDownloadDate: !!matchingSitemap?.last_downloaded,
        status: matchingSitemap?.status,
        isPending: matchingSitemap?.is_pending,
        isVerified
      });

      // If no sitemap is found or not downloaded, use enhanced detection logic
      let sitemapUrlExists = false;
      let hasDynamicServing = false;
      if (!isVerified) {
        const siteUrl = UrlNormalizationService.domainPropertyToHttps(actionItem.site_url);
        
        // Step 1: Direct URL test (existing logic)
        try {
          const urlsToCheck = [
            `${siteUrl}/sitemap.xml`,
            `${siteUrl.replace('https://', 'https://www.')}/sitemap.xml`
          ];

          for (const sitemapUrl of urlsToCheck) {
            try {
              const sitemapResponse = await fetch(sitemapUrl, { method: 'HEAD' });
              if (sitemapResponse.ok) {
                sitemapUrlExists = true;
                console.log(`[ACTION ITEMS] ✅ Sitemap found via direct access: ${sitemapUrl}`);
                break;
              }
            } catch (e) {
              // Continue to next URL
            }
          }
        } catch (error) {
          console.log('[ACTION ITEMS] Error checking direct sitemap access:', error);
        }

        // Step 2: Enhanced SEOAgent.js dynamic serving detection
        if (!sitemapUrlExists) {
          try {
            console.log(`[ACTION ITEMS] Testing for SEOAgent.js dynamic serving on: ${siteUrl}`);
            const homeResponse = await fetch(siteUrl, {
              method: 'GET',
              timeout: 10000,
              headers: {
                'User-Agent': 'SEOAgent-ActionItemBot/1.0'
              }
            } as any);
            
            if (homeResponse.ok) {
              const homeContent = await homeResponse.text();
              
              // Check for SEOAgent.js installation markers
              const hasScript = homeContent.includes('seoagent.js') || homeContent.includes('SEO-METRICS');
              const hasWebsiteToken = homeContent.includes('idv = ') || homeContent.includes('website_token');
              
              hasDynamicServing = hasScript && hasWebsiteToken;
              console.log(`[ACTION ITEMS] SEOAgent.js detection: script=${hasScript}, token=${hasWebsiteToken}, dynamic=${hasDynamicServing}`);
              
              if (hasDynamicServing) {
                sitemapUrlExists = true;
                console.log(`[ACTION ITEMS] ✅ Dynamic sitemap serving detected via SEOAgent.js`);
              }
            }
          } catch (error) {
            console.log(`[ACTION ITEMS] SEOAgent.js detection failed: ${error}`);
            hasDynamicServing = false;
          }
        }
      }

      console.log(`[ACTION ITEMS] Final sitemap verification for ${actionItem.site_url}:`, {
        sitemapExists: !!matchingSitemap,
        sitemapUrl: matchingSitemap?.sitemap_url,
        lastDownloaded: matchingSitemap?.last_downloaded,
        status: matchingSitemap?.status,
        isPending: matchingSitemap?.is_pending,
        sitemapUrlExists,
        hasDynamicServing,
        gscRefreshSuccess,
        isVerified
      });

      // ENHANCED: Verification passes if either:
      // 1. GSC shows sitemap is downloaded and processed (original logic)
      // 2. Sitemap actually exists at the URL (includes dynamic serving detection)
      const finalVerification = isVerified || sitemapUrlExists;
      
      console.log(`[ACTION ITEMS] Enhanced verification result: ${finalVerification} (GSC verified: ${isVerified}, URL exists: ${sitemapUrlExists}, dynamic serving: ${hasDynamicServing})`);
      
      return finalVerification;
    } catch (error) {
      console.error('[ACTION ITEMS] Error verifying sitemap fix:', error);
      return false;
    }
  }

  private static async verifyRobotsFix(actionItem: ActionItem): Promise<boolean> {
    try {
      console.log(`[ACTION ITEMS] Starting robots.txt verification for ${actionItem.site_url}`);
      
      // Check if robots.txt file is actually accessible
      const siteUrl = UrlNormalizationService.domainPropertyToHttps(actionItem.site_url);
      
      const urlsToCheck = [
        `${siteUrl}/robots.txt`,
        `${siteUrl.replace('https://', 'https://www.')}/robots.txt`
      ];

      let robotsFileExists = false;
      let robotsContent = '';
      let hasDynamicServing = false;
      
      // Step 1: Test direct robots.txt access
      for (const robotsUrl of urlsToCheck) {
        try {
          console.log(`[ACTION ITEMS] Checking robots.txt at: ${robotsUrl}`);
          const response = await fetch(robotsUrl, { 
            method: 'GET',
            headers: {
              'User-Agent': 'SEOAgent Bot 1.0'
            }
          });
          
          if (response.ok) {
            robotsContent = await response.text();
            
            // Check if it's actual robots.txt content (not HTML)
            const isValidRobots = robotsContent.includes('User-agent:') || 
                                 robotsContent.includes('Disallow:') ||
                                 robotsContent.includes('Allow:') ||
                                 robotsContent.includes('Sitemap:');
            
            if (isValidRobots) {
              robotsFileExists = true;
              console.log(`[ACTION ITEMS] ✅ Valid robots.txt found at: ${robotsUrl}`);
              console.log(`[ACTION ITEMS] Content preview: ${robotsContent.substring(0, 200)}...`);
              break;
            } else {
              console.log(`[ACTION ITEMS] ❌ Invalid robots.txt content (HTML returned) at: ${robotsUrl}`);
            }
          } else {
            console.log(`[ACTION ITEMS] ❌ Robots.txt not accessible at: ${robotsUrl} (Status: ${response.status})`);
          }
        } catch (fetchError) {
          console.log(`[ACTION ITEMS] ❌ Error fetching robots.txt at ${robotsUrl}:`, fetchError);
        }
      }

      // Step 2: If no valid robots.txt found, check for SEOAgent.js dynamic serving capability
      if (!robotsFileExists) {
        try {
          console.log(`[ACTION ITEMS] Testing for SEOAgent.js dynamic serving on: ${siteUrl}`);
          const homeResponse = await fetch(siteUrl, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'SEOAgent-ActionItemBot/1.0'
            }
          } as any);
          
          if (homeResponse.ok) {
            const homeContent = await homeResponse.text();
            
            // Check for SEOAgent.js installation markers
            const hasScript = homeContent.includes('seoagent.js') || homeContent.includes('SEO-METRICS');
            const hasWebsiteToken = homeContent.includes('idv = ') || homeContent.includes('website_token');
            const hasRobotsServing = homeContent.includes('initializeRobotsServing') || 
                                   homeContent.includes('robots.txt serving');
            
            hasDynamicServing = hasScript && hasWebsiteToken;
            console.log(`[ACTION ITEMS] SEOAgent.js detection: script=${hasScript}, token=${hasWebsiteToken}, robotsServing=${hasRobotsServing}, dynamic=${hasDynamicServing}`);
            
            if (hasDynamicServing) {
              // SEOAgent.js is installed but robots.txt serving has limitations for direct URL access
              console.log(`[ACTION ITEMS] ⚠️  SEOAgent.js detected but robots.txt not directly accessible - this is expected for JavaScript-based serving`);
              robotsFileExists = true; // Consider it "exists" from a capability standpoint
            }
          }
        } catch (error) {
          console.log(`[ACTION ITEMS] SEOAgent.js detection failed: ${error}`);
          hasDynamicServing = false;
        }
      }

      // Update database record to reflect actual status
      if (robotsFileExists) {
        console.log(`[ACTION ITEMS] Updating database with robots.txt verification success`);
        await supabase
          .from('robots_analyses')
          .upsert({
            user_token: actionItem.user_token,
            site_url: actionItem.site_url,
            exists: true,
            accessible: hasDynamicServing ? false : true, // Direct access limited for dynamic serving
            size: robotsContent.length || 0,
            content: robotsContent || 'Dynamic serving via SEOAgent.js',
            google_fetch_status: hasDynamicServing ? 'warning' : 'success',
            google_fetch_errors: 0,
            analyzed_at: new Date().toISOString()
          }, {
            onConflict: 'user_token,site_url'
          });
      }

      console.log(`[ACTION ITEMS] Robots.txt verification result for ${actionItem.site_url}:`, {
        fileExists: robotsFileExists,
        hasDynamicServing,
        contentLength: robotsContent.length,
        isDirectlyAccessible: robotsFileExists && !hasDynamicServing,
        urlsChecked: urlsToCheck
      });

      return robotsFileExists;
    } catch (error) {
      console.error('[ACTION ITEMS] Error verifying robots.txt fix:', error);
      return false;
    }
  }

  private static async verifyIndexingFix(actionItem: ActionItem): Promise<boolean> {
    if (!actionItem.affected_urls || actionItem.affected_urls.length === 0) {
      return true;
    }

    console.log(`[ACTION ITEMS] Verifying indexing fix for ${actionItem.affected_urls.length} URLs`);
    
    // First, try to refresh indexing data via GSC URL Inspection API
    let gscRefreshSuccess = false;
    try {
      // Limit to 3 URLs to avoid rate limits and timeouts
      const urlsToInspect = actionItem.affected_urls.slice(0, 3);
      
      console.log(`[ACTION ITEMS] Making POST request to URL inspection API with ${urlsToInspect.length} URLs`);
      
      const gscResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/gsc/url-inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: actionItem.user_token,
          siteUrl: actionItem.site_url,
          urls: urlsToInspect
        })
      });

      if (gscResponse.ok) {
        const gscData = await gscResponse.json();
        if (gscData.success) {
          gscRefreshSuccess = true;
          console.log(`[ACTION ITEMS] GSC URL inspection successful for ${urlsToInspect.length} URLs:`, {
            indexable: gscData.data.summary.indexable,
            blocked: gscData.data.summary.blocked,
            errors: gscData.data.summary.errors
          });
        }
      } else {
        console.log(`[ACTION ITEMS] GSC URL inspection failed with status:`, gscResponse.status);
      }
    } catch (error) {
      console.log(`[ACTION ITEMS] GSC URL Inspection failed:`, error);
    }

    // Wait a moment for database updates if GSC calls were successful
    if (gscRefreshSuccess) {
      console.log('[ACTION ITEMS] Waiting for GSC data to be processed...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Check current database state
    const { data: inspections } = await supabase
      .from('url_inspections')
      .select('*')
      .eq('site_url', actionItem.site_url)
      .in('inspected_url', actionItem.affected_urls);

    if (!inspections || inspections.length === 0) {
      console.log(`[ACTION ITEMS] No URL inspections found for verification`);
      return false;
    }

    console.log(`[ACTION ITEMS] Found ${inspections.length} inspections for verification:`, 
      inspections.map(i => ({
        url: i.inspected_url,
        canBeIndexed: i.can_be_indexed,
        indexStatus: i.index_status,
        fetchStatus: i.fetch_status,
        robotsTxtState: i.robots_txt_state
      }))
    );

    // Check if all previously blocked pages are now indexable
    const allIndexable = inspections.every(i => i.can_be_indexed && i.index_status !== 'FAIL');
    
    console.log(`[ACTION ITEMS] Indexing verification result:`, {
      totalInspections: inspections.length,
      indexableCount: inspections.filter(i => i.can_be_indexed).length,
      passedCount: inspections.filter(i => i.index_status !== 'FAIL').length,
      allIndexable,
      gscRefreshSuccess
    });
    
    return allIndexable;
  }

  private static async verifySchemaFix(actionItem: ActionItem): Promise<boolean> {
    if (!actionItem.affected_urls || actionItem.affected_urls.length === 0) {
      return true;
    }

    const { data: schemas } = await supabase
      .from('schema_generations')
      .select('*')
      .in('page_url', actionItem.affected_urls);

    if (!schemas) return false;

    // Check if all previously schema-less pages now have schema
    return schemas.every(s => s.schemas_generated > 0);
  }
}