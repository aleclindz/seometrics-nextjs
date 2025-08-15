import { createClient } from '@supabase/supabase-js';

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
  status: 'detected' | 'assigned' | 'in_progress' | 'completed' | 'verified' | 'closed' | 'dismissed';
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
        status: verificationResult ? 'verified' : 'completed'
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
      issues.push({
        type: 'indexing_blocked_pages',
        category: 'indexing',
        severity: blockedPages.length > 5 ? 'critical' : 'high',
        title: `${blockedPages.length} Pages Cannot Be Indexed`,
        description: `${blockedPages.length} pages are blocked from search engine indexing due to various issues.`,
        impactDescription: 'These pages will not appear in search results, significantly reducing organic traffic potential.',
        fixRecommendation: 'Review and fix indexing issues including robots.txt blocks, 404 errors, and server errors.',
        affectedUrls: blockedPages.map(p => p.inspected_url),
        estimatedImpact: blockedPages.length > 10 ? 'high' : 'medium',
        estimatedEffort: 'medium',
        metadata: { blockedCount: blockedPages.length, issueTypes: blockedPages.map(p => p.index_status) }
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

    if (!sitemap) {
      issues.push({
        type: 'sitemap_missing',
        category: 'sitemap',
        severity: 'high',
        title: 'XML Sitemap Missing',
        description: 'No XML sitemap has been submitted to Google Search Console.',
        impactDescription: 'Missing sitemaps make it harder for search engines to discover and index your pages.',
        fixRecommendation: 'Generate and submit an XML sitemap to Google Search Console.',
        affectedUrls: [siteUrl],
        estimatedImpact: 'high',
        estimatedEffort: 'easy',
        referenceTable: 'sitemap_submissions'
      });
    } else if (sitemap.google_download_status === 'pending' || !sitemap.google_last_downloaded) {
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
        referenceTable: 'sitemap_submissions'
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

    if (!robots || !robots.exists) {
      issues.push({
        type: 'robots_missing',
        category: 'robots',
        severity: 'medium',
        title: 'Robots.txt File Missing',
        description: 'No robots.txt file found or accessible.',
        impactDescription: 'Missing robots.txt can lead to crawling inefficiencies and missed SEO opportunities.',
        fixRecommendation: 'Create a properly formatted robots.txt file.',
        affectedUrls: [`${siteUrl}/robots.txt`],
        estimatedImpact: 'medium',
        estimatedEffort: 'easy',
        referenceId: robots?.id,
        referenceTable: 'robots_analyses'
      });
    } else if (robots.google_fetch_status === 'error' || robots.google_fetch_errors > 0) {
      issues.push({
        type: 'robots_fetch_errors',
        category: 'robots',
        severity: 'medium',
        title: 'Robots.txt Fetch Errors',
        description: 'Google is encountering errors when trying to fetch your robots.txt file.',
        impactDescription: 'Fetch errors can prevent proper crawling of your website.',
        fixRecommendation: 'Check robots.txt accessibility and fix any server-side issues.',
        affectedUrls: [`${siteUrl}/robots.txt`],
        estimatedImpact: 'medium',
        estimatedEffort: 'medium',
        referenceId: robots.id,
        referenceTable: 'robots_analyses'
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
    const { data: sitemap } = await supabase
      .from('sitemap_submissions')
      .select('*')
      .eq('site_url', actionItem.site_url)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return !!(sitemap && sitemap.google_last_downloaded);
  }

  private static async verifyRobotsFix(actionItem: ActionItem): Promise<boolean> {
    const { data: robots } = await supabase
      .from('robots_analyses')
      .select('*')
      .eq('site_url', actionItem.site_url)
      .single();

    return !!(robots && robots.exists && robots.google_fetch_status !== 'error');
  }

  private static async verifyIndexingFix(actionItem: ActionItem): Promise<boolean> {
    if (!actionItem.affected_urls || actionItem.affected_urls.length === 0) {
      return true;
    }

    const { data: inspections } = await supabase
      .from('url_inspections')
      .select('*')
      .eq('site_url', actionItem.site_url)
      .in('inspected_url', actionItem.affected_urls);

    if (!inspections) return false;

    // Check if all previously blocked pages are now indexable
    return inspections.every(i => i.can_be_indexed);
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