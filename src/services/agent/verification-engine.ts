import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verification interfaces
interface VerificationCheck {
  checkType: string;
  targetUrl: string;
  expectedResult: any;
  actualResult?: any;
  passed: boolean;
  error?: string;
  timestamp: string;
}

interface VerificationResult {
  actionId: string;
  runId: string;
  overallStatus: 'verified' | 'failed' | 'partial';
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  checks: VerificationCheck[];
  summary: string;
}

interface PatchVerification {
  patchId: string;
  targetUrl: string;
  expectedChanges: {
    selector: string;
    property: string;
    expectedValue: string;
  }[];
}

export class VerificationEngine {
  /**
   * Verify that an action's changes are working as expected
   */
  static async verifyAction(actionId: string, runId: string): Promise<VerificationResult> {
    console.log(`[VERIFICATION] Starting verification for action ${actionId}, run ${runId}`);

    try {
      // Get action details and patches to verify
      const { action, patches } = await this.getActionData(actionId, runId);
      
      if (!action) {
        throw new Error(`Action ${actionId} not found`);
      }

      const checks: VerificationCheck[] = [];

      // Verify based on action type
      switch (action.action_type) {
        case 'technical_seo_fix':
          checks.push(...await this.verifyTechnicalSEOFixes(patches));
          break;
        case 'content_generation':
          checks.push(...await this.verifyContentGeneration(action, patches));
          break;
        case 'cms_publishing':
          checks.push(...await this.verifyCMSPublishing(action, patches));
          break;
        case 'schema_injection':
          checks.push(...await this.verifySchemaInjection(patches));
          break;
        case 'technical_seo_crawl':
          checks.push(...await this.verifyCrawlCompletion(action));
          break;
        default:
          checks.push(...await this.verifyGenericPatches(patches));
      }

      // Calculate overall status
      const passedChecks = checks.filter(c => c.passed).length;
      const failedChecks = checks.filter(c => !c.passed).length;
      
      let overallStatus: 'verified' | 'failed' | 'partial';
      if (failedChecks === 0) {
        overallStatus = 'verified';
      } else if (passedChecks > 0) {
        overallStatus = 'partial';
      } else {
        overallStatus = 'failed';
      }

      const result: VerificationResult = {
        actionId,
        runId,
        overallStatus,
        totalChecks: checks.length,
        passedChecks,
        failedChecks,
        checks,
        summary: this.generateSummary(overallStatus, passedChecks, failedChecks, checks)
      };

      // Update action and patches with verification results
      await this.updateVerificationStatus(actionId, runId, patches.map(p => p.id), result);

      console.log(`[VERIFICATION] Completed verification for action ${actionId}: ${overallStatus}`);
      return result;

    } catch (error) {
      console.error(`[VERIFICATION] Error verifying action ${actionId}:`, error);
      
      const failedResult: VerificationResult = {
        actionId,
        runId,
        overallStatus: 'failed',
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 1,
        checks: [{
          checkType: 'system_error',
          targetUrl: '',
          expectedResult: 'successful_verification',
          actualResult: error instanceof Error ? error.message : 'Unknown error',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }],
        summary: `Verification failed due to system error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };

      await this.updateVerificationStatus(actionId, runId, [], failedResult);
      return failedResult;
    }
  }

  /**
   * Verify technical SEO fixes
   */
  private static async verifyTechnicalSEOFixes(patches: any[]): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    for (const patch of patches) {
      if (patch.change_type === 'upsert_meta') {
        const check = await this.verifyMetaTagChange(patch);
        checks.push(check);
      } else if (patch.change_type === 'add_alt_text') {
        const check = await this.verifyAltTextChange(patch);
        checks.push(check);
      } else if (patch.change_type === 'inject_schema') {
        const check = await this.verifySchemaMarkup(patch);
        checks.push(check);
      } else if (patch.change_type === 'set_canonical') {
        const check = await this.verifyCanonicalTag(patch);
        checks.push(check);
      }
    }

    return checks;
  }

  /**
   * Verify content generation results
   */
  private static async verifyContentGeneration(action: any, patches: any[]): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    // Check if content was created
    const contentCheck: VerificationCheck = {
      checkType: 'content_existence',
      targetUrl: action.payload.target_url || action.site_url,
      expectedResult: 'content_generated',
      passed: false,
      timestamp: new Date().toISOString()
    };

    try {
      // This would check if the content was actually created
      // For now, we'll simulate based on patches
      if (patches.length > 0) {
        contentCheck.actualResult = `${patches.length} content patches applied`;
        contentCheck.passed = true;
      } else {
        contentCheck.actualResult = 'No content patches found';
        contentCheck.error = 'Content generation did not produce any patches';
      }
    } catch (error) {
      contentCheck.error = error instanceof Error ? error.message : 'Unknown error';
      contentCheck.actualResult = 'verification_failed';
    }

    checks.push(contentCheck);
    return checks;
  }

  /**
   * Verify CMS publishing
   */
  private static async verifyCMSPublishing(action: any, patches: any[]): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    // Check if content was published to CMS
    const publishCheck: VerificationCheck = {
      checkType: 'cms_publication',
      targetUrl: action.payload.public_url || action.site_url,
      expectedResult: 'content_published',
      passed: false,
      timestamp: new Date().toISOString()
    };

    try {
      if (action.payload.cms_article_id) {
        // Check if the published content is accessible
        const response = await fetch(action.payload.public_url);
        if (response.ok) {
          publishCheck.actualResult = `Content published and accessible (HTTP ${response.status})`;
          publishCheck.passed = true;
        } else {
          publishCheck.actualResult = `Content published but not accessible (HTTP ${response.status})`;
          publishCheck.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      } else {
        publishCheck.actualResult = 'No CMS article ID found';
        publishCheck.error = 'CMS publishing did not complete successfully';
      }
    } catch (error) {
      publishCheck.error = error instanceof Error ? error.message : 'Unknown error';
      publishCheck.actualResult = 'verification_failed';
    }

    checks.push(publishCheck);
    return checks;
  }

  /**
   * Verify schema injection
   */
  private static async verifySchemaInjection(patches: any[]): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    for (const patch of patches.filter(p => p.change_type === 'inject_schema')) {
      const check = await this.verifySchemaMarkup(patch);
      checks.push(check);
    }

    return checks;
  }

  /**
   * Verify crawl completion
   */
  private static async verifyCrawlCompletion(action: any): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    const crawlCheck: VerificationCheck = {
      checkType: 'crawl_completion',
      targetUrl: action.site_url,
      expectedResult: 'crawl_data_collected',
      passed: false,
      timestamp: new Date().toISOString()
    };

    try {
      // Check if crawl results were stored in the database
      const { data: crawlData, error } = await supabase
        .from('url_inspections')
        .select('id')
        .eq('user_token', action.user_token)
        .eq('site_url', action.site_url)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .limit(1);

      if (error) {
        throw error;
      }

      if (crawlData && crawlData.length > 0) {
        crawlCheck.actualResult = 'Crawl data found in database';
        crawlCheck.passed = true;
      } else {
        crawlCheck.actualResult = 'No recent crawl data found';
        crawlCheck.error = 'Crawl may not have completed or stored data';
      }
    } catch (error) {
      crawlCheck.error = error instanceof Error ? error.message : 'Unknown error';
      crawlCheck.actualResult = 'verification_failed';
    }

    checks.push(crawlCheck);
    return checks;
  }

  /**
   * Verify generic patches
   */
  private static async verifyGenericPatches(patches: any[]): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    for (const patch of patches) {
      const check: VerificationCheck = {
        checkType: 'patch_application',
        targetUrl: patch.target_url,
        expectedResult: patch.after_value,
        passed: false,
        timestamp: new Date().toISOString()
      };

      try {
        // For generic verification, we'll just check if the patch was marked as applied
        if (patch.status === 'applied') {
          check.actualResult = 'Patch marked as applied';
          check.passed = true;
        } else {
          check.actualResult = `Patch status: ${patch.status}`;
          check.error = 'Patch was not successfully applied';
        }
      } catch (error) {
        check.error = error instanceof Error ? error.message : 'Unknown error';
        check.actualResult = 'verification_failed';
      }

      checks.push(check);
    }

    return checks;
  }

  /**
   * Individual verification methods for specific patch types
   */
  private static async verifyMetaTagChange(patch: any): Promise<VerificationCheck> {
    const check: VerificationCheck = {
      checkType: 'meta_tag_verification',
      targetUrl: patch.target_url,
      expectedResult: patch.after_value,
      passed: false,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(patch.target_url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Check for the meta tag based on selector
      const selector = patch.selector || `meta[name="${patch.element_type}"]`;
      const element = $(selector).first();

      if (element.length > 0) {
        const actualContent = element.attr('content') || element.text();
        if (actualContent === patch.after_value) {
          check.actualResult = actualContent;
          check.passed = true;
        } else {
          check.actualResult = actualContent;
          check.error = `Expected "${patch.after_value}", found "${actualContent}"`;
        }
      } else {
        check.actualResult = 'Meta tag not found';
        check.error = `Meta tag with selector "${selector}" not found`;
      }
    } catch (error) {
      check.error = error instanceof Error ? error.message : 'Unknown error';
      check.actualResult = 'verification_failed';
    }

    return check;
  }

  private static async verifyAltTextChange(patch: any): Promise<VerificationCheck> {
    const check: VerificationCheck = {
      checkType: 'alt_text_verification',
      targetUrl: patch.target_url,
      expectedResult: patch.after_value,
      passed: false,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(patch.target_url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const selector = patch.selector || `img[src*="${patch.target_url}"]`;
      const element = $(selector).first();

      if (element.length > 0) {
        const actualAlt = element.attr('alt') || '';
        if (actualAlt === patch.after_value) {
          check.actualResult = actualAlt;
          check.passed = true;
        } else {
          check.actualResult = actualAlt;
          check.error = `Expected "${patch.after_value}", found "${actualAlt}"`;
        }
      } else {
        check.actualResult = 'Image element not found';
        check.error = `Image with selector "${selector}" not found`;
      }
    } catch (error) {
      check.error = error instanceof Error ? error.message : 'Unknown error';
      check.actualResult = 'verification_failed';
    }

    return check;
  }

  private static async verifySchemaMarkup(patch: any): Promise<VerificationCheck> {
    const check: VerificationCheck = {
      checkType: 'schema_verification',
      targetUrl: patch.target_url,
      expectedResult: 'valid_schema_present',
      passed: false,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(patch.target_url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Look for JSON-LD schema markup
      const schemaElements = $('script[type="application/ld+json"]');
      
      if (schemaElements.length > 0) {
        try {
          schemaElements.each((i, element) => {
            const schemaContent = $(element).html();
            if (schemaContent) {
              JSON.parse(schemaContent); // Validate JSON
            }
          });
          
          check.actualResult = `${schemaElements.length} valid schema markup(s) found`;
          check.passed = true;
        } catch (jsonError) {
          check.actualResult = 'Invalid JSON in schema markup';
          check.error = `Schema JSON parsing failed: ${jsonError}`;
        }
      } else {
        check.actualResult = 'No schema markup found';
        check.error = 'Expected schema markup but none found';
      }
    } catch (error) {
      check.error = error instanceof Error ? error.message : 'Unknown error';
      check.actualResult = 'verification_failed';
    }

    return check;
  }

  private static async verifyCanonicalTag(patch: any): Promise<VerificationCheck> {
    const check: VerificationCheck = {
      checkType: 'canonical_verification',
      targetUrl: patch.target_url,
      expectedResult: patch.after_value,
      passed: false,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(patch.target_url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const canonicalElement = $('link[rel="canonical"]').first();

      if (canonicalElement.length > 0) {
        const actualHref = canonicalElement.attr('href');
        if (actualHref === patch.after_value) {
          check.actualResult = actualHref;
          check.passed = true;
        } else {
          check.actualResult = actualHref;
          check.error = `Expected "${patch.after_value}", found "${actualHref}"`;
        }
      } else {
        check.actualResult = 'Canonical tag not found';
        check.error = 'Expected canonical tag but none found';
      }
    } catch (error) {
      check.error = error instanceof Error ? error.message : 'Unknown error';
      check.actualResult = 'verification_failed';
    }

    return check;
  }

  /**
   * Helper methods
   */
  private static async getActionData(actionId: string, runId: string) {
    const { data: action, error: actionError } = await supabase
      .from('agent_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    const { data: patches, error: patchesError } = await supabase
      .from('agent_patches')
      .select('*')
      .eq('run_id', runId);

    if (actionError || patchesError) {
      throw new Error(`Failed to get action data: ${actionError?.message || patchesError?.message}`);
    }

    return { action, patches: patches || [] };
  }

  private static async updateVerificationStatus(
    actionId: string,
    runId: string,
    patchIds: string[],
    result: VerificationResult
  ) {
    // Update action status based on verification result
    const newActionStatus = result.overallStatus === 'verified' ? 'verified' : 'failed';
    
    await supabase
      .from('agent_actions')
      .update({
        status: newActionStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId);

    // Update patches with verification status
    if (patchIds.length > 0) {
      await supabase
        .from('agent_patches')
        .update({
          verification_status: result.overallStatus,
          verification_details: { checks: result.checks },
          updated_at: new Date().toISOString()
        })
        .in('id', patchIds);
    }

    // Store detailed verification results
    await supabase
      .from('agent_events')
      .insert({
        user_token: (await supabase.from('agent_actions').select('user_token').eq('id', actionId).single()).data?.user_token,
        event_type: 'verification_completed',
        entity_type: 'action',
        entity_id: actionId,
        event_data: {
          run_id: runId,
          verification_result: result
        },
        triggered_by: 'system'
      });
  }

  private static generateSummary(
    overallStatus: string,
    passedChecks: number,
    failedChecks: number,
    checks: VerificationCheck[]
  ): string {
    if (overallStatus === 'verified') {
      return `All ${passedChecks} verification checks passed successfully`;
    } else if (overallStatus === 'partial') {
      return `${passedChecks} checks passed, ${failedChecks} failed - partial success`;
    } else {
      const mainError = checks.find(c => !c.passed)?.error || 'Unknown error';
      return `Verification failed: ${mainError} (${failedChecks} failed checks)`;
    }
  }
}

// Install cheerio for HTML parsing if not already installed
// npm install cheerio @types/cheerio