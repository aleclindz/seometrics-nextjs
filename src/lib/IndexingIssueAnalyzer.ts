/**
 * IndexingIssueAnalyzer - Diagnose specific indexing problems in plain English
 * 
 * Analyzes url_inspections data to provide detailed, user-friendly explanations
 * of why pages cannot be indexed and what can be done to fix them.
 */

export interface IndexingProblem {
  url: string;
  primaryIssue: string;
  explanation: string;
  impact: string;
  fixable: 'auto' | 'code' | 'manual';
  fixMethod?: string;
  technicalDetails: {
    indexStatus: string;
    fetchStatus: string;
    robotsTxtState: string;
    canBeIndexed: boolean;
    lastCrawlTime?: string;
  };
}

export interface IndexingAnalysis {
  totalAffectedPages: number;
  problemsByType: Record<string, IndexingProblem[]>;
  autoFixableCount: number;
  codeFixableCount: number;
  manualOnlyCount: number;
  summary: string;
  detailedExplanation: string;
  recommendedActions: string[];
}

export class IndexingIssueAnalyzer {
  /**
   * Analyze URL inspection data and return detailed problems
   */
  static analyzeIndexingIssues(urlInspections: any[]): IndexingAnalysis {
    console.log(`[INDEXING ANALYZER] Analyzing ${urlInspections.length} URL inspections`);
    
    const problems: IndexingProblem[] = [];
    
    // Process each URL inspection
    for (const inspection of urlInspections) {
      if (!inspection.can_be_indexed || inspection.index_status === 'FAIL') {
        const problem = this.diagnoseProblem(inspection);
        problems.push(problem);
      }
    }
    
    // Group problems by type
    const problemsByType: Record<string, IndexingProblem[]> = {};
    for (const problem of problems) {
      if (!problemsByType[problem.primaryIssue]) {
        problemsByType[problem.primaryIssue] = [];
      }
      problemsByType[problem.primaryIssue].push(problem);
    }
    
    // Count fixability
    const autoFixableCount = problems.filter(p => p.fixable === 'auto').length;
    const codeFixableCount = problems.filter(p => p.fixable === 'code').length;
    const manualOnlyCount = problems.filter(p => p.fixable === 'manual').length;
    
    // Generate summary and recommendations
    const summary = this.generateSummary(problems.length, problemsByType);
    const detailedExplanation = this.generateDetailedExplanation(problems, problemsByType);
    const recommendedActions = this.generateRecommendedActions(problems, autoFixableCount, codeFixableCount);
    
    return {
      totalAffectedPages: problems.length,
      problemsByType,
      autoFixableCount,
      codeFixableCount,
      manualOnlyCount,
      summary,
      detailedExplanation,
      recommendedActions
    };
  }

  /**
   * Diagnose specific problem for a single URL inspection
   */
  private static diagnoseProblem(inspection: any): IndexingProblem {
    const url = inspection.inspected_url;
    const indexStatus = inspection.index_status;
    const fetchStatus = inspection.fetch_status;
    const robotsTxtState = inspection.robots_txt_state;
    
    // Robots.txt blocking
    if (robotsTxtState === 'DISALLOWED') {
      return {
        url,
        primaryIssue: 'Robots.txt Blocking',
        explanation: `Your website&apos;s robots.txt file is telling Google not to access this page. This is like putting a &ldquo;Do Not Enter&rdquo; sign on your page.`,
        impact: 'Google cannot crawl or index this page, so it will never appear in search results.',
        fixable: 'auto',
        fixMethod: 'Update robots.txt file to allow Google access',
        technicalDetails: {
          indexStatus,
          fetchStatus: fetchStatus || 'unknown',
          robotsTxtState,
          canBeIndexed: inspection.can_be_indexed,
          lastCrawlTime: inspection.last_crawl_time
        }
      };
    }
    
    // Server errors (5xx)
    if (fetchStatus === 'SERVER_ERROR' || fetchStatus?.startsWith('5')) {
      return {
        url,
        primaryIssue: 'Server Error',
        explanation: `Your web server is returning an error when Google tries to access this page. This means your server is having technical problems.`,
        impact: 'Google cannot access the page content, so it cannot be indexed for search results.',
        fixable: 'code',
        fixMethod: 'Fix server configuration or application errors',
        technicalDetails: {
          indexStatus,
          fetchStatus: fetchStatus || 'unknown',
          robotsTxtState,
          canBeIndexed: inspection.can_be_indexed,
          lastCrawlTime: inspection.last_crawl_time
        }
      };
    }
    
    // Not found errors (404)
    if (fetchStatus === 'SOFT_404' || fetchStatus === '404' || fetchStatus === 'NOT_FOUND') {
      return {
        url,
        primaryIssue: 'Page Not Found',
        explanation: `This page returns a &ldquo;Page Not Found&rdquo; error. Either the page was deleted, moved, or the URL is incorrect.`,
        impact: 'Google cannot find any content at this URL, so there&apos;s nothing to index.',
        fixable: 'code',
        fixMethod: 'Create the missing page or set up a redirect to the correct location',
        technicalDetails: {
          indexStatus,
          fetchStatus: fetchStatus || 'unknown',
          robotsTxtState,
          canBeIndexed: inspection.can_be_indexed,
          lastCrawlTime: inspection.last_crawl_time
        }
      };
    }
    
    // Access denied (403)
    if (fetchStatus === 'ACCESS_DENIED' || fetchStatus === '403') {
      return {
        url,
        primaryIssue: 'Access Denied',
        explanation: `Your website is blocking Google from accessing this page. This could be due to password protection, IP restrictions, or server configuration.`,
        impact: 'Google is being refused access to the page content, preventing indexing.',
        fixable: 'auto',
        fixMethod: 'Update server configuration to allow search engine access',
        technicalDetails: {
          indexStatus,
          fetchStatus: fetchStatus || 'unknown',
          robotsTxtState,
          canBeIndexed: inspection.can_be_indexed,
          lastCrawlTime: inspection.last_crawl_time
        }
      };
    }
    
    // Redirect issues
    if (fetchStatus?.includes('REDIRECT') && indexStatus === 'FAIL') {
      return {
        url,
        primaryIssue: 'Redirect Problem',
        explanation: `This page has a redirect, but Google is having trouble following it to the final destination page.`,
        impact: 'Google cannot reach the actual content, so the page cannot be indexed properly.',
        fixable: 'code',
        fixMethod: 'Fix redirect chain or update redirect destination',
        technicalDetails: {
          indexStatus,
          fetchStatus: fetchStatus || 'unknown',
          robotsTxtState,
          canBeIndexed: inspection.can_be_indexed,
          lastCrawlTime: inspection.last_crawl_time
        }
      };
    }
    
    // Generic indexing issue
    return {
      url,
      primaryIssue: 'Indexing Issue',
      explanation: `Google is having trouble indexing this page due to technical issues that need investigation.`,
      impact: 'The page may not appear in search results or may have limited visibility.',
      fixable: 'manual',
      fixMethod: 'Manual investigation needed to determine specific cause',
      technicalDetails: {
        indexStatus,
        fetchStatus: fetchStatus || 'unknown',
        robotsTxtState,
        canBeIndexed: inspection.can_be_indexed,
        lastCrawlTime: inspection.last_crawl_time
      }
    };
  }

  /**
   * Generate user-friendly summary
   */
  private static generateSummary(totalProblems: number, problemsByType: Record<string, IndexingProblem[]>): string {
    if (totalProblems === 1) {
      const problemType = Object.keys(problemsByType)[0];
      return `1 page has a ${problemType.toLowerCase()} preventing it from appearing in Google search results.`;
    }
    
    const types = Object.keys(problemsByType);
    if (types.length === 1) {
      return `${totalProblems} pages have ${types[0].toLowerCase()} issues preventing them from appearing in Google search results.`;
    }
    
    return `${totalProblems} pages have various indexing problems preventing them from appearing in Google search results.`;
  }

  /**
   * Generate detailed explanation for users
   */
  private static generateDetailedExplanation(problems: IndexingProblem[], problemsByType: Record<string, IndexingProblem[]>): string {
    let explanation = "Here&apos;s what&apos;s happening with your pages:\n\n";
    
    for (const [problemType, problemList] of Object.entries(problemsByType)) {
      explanation += `**${problemType} (${problemList.length} page${problemList.length > 1 ? 's' : ''}):**\n`;
      explanation += `${problemList[0].explanation}\n\n`;
      
      // Show affected URLs
      for (const problem of problemList.slice(0, 3)) { // Show first 3
        explanation += `• ${problem.url}\n`;
      }
      if (problemList.length > 3) {
        explanation += `• ...and ${problemList.length - 3} more pages\n`;
      }
      explanation += "\n";
    }
    
    return explanation.trim();
  }

  /**
   * Generate recommended actions based on problem analysis
   */
  private static generateRecommendedActions(problems: IndexingProblem[], autoFixableCount: number, codeFixableCount: number): string[] {
    const actions: string[] = [];
    
    if (autoFixableCount > 0) {
      actions.push(`✅ **${autoFixableCount} issue${autoFixableCount > 1 ? 's' : ''} can be fixed automatically** - Click "Fix Now" and SEOAgent will resolve these for you.`);
    }
    
    if (codeFixableCount > 0) {
      actions.push(`🛠️ **${codeFixableCount} issue${codeFixableCount > 1 ? 's' : ''} need code changes** - Click "Generate Fix Instructions" to get step-by-step guidance.`);
    }
    
    const manualCount = problems.length - autoFixableCount - codeFixableCount;
    if (manualCount > 0) {
      actions.push(`📋 **${manualCount} issue${manualCount > 1 ? 's' : ''} need manual review** - These require investigation to determine the best solution.`);
    }
    
    // Add timing expectation
    if (autoFixableCount > 0) {
      actions.push("⏱️ **After fixes are applied**, it may take 24-48 hours for Google to re-crawl your pages and recognize the changes.");
    }
    
    return actions;
  }
}