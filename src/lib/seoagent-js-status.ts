/**
 * SEOAgent.js Status Checker
 * Determines if seoagent.js is active for a given website
 */

/**
 * Check if seoagent.js should be considered active for a website
 * This includes both sites with the script installed and the SEOAgent app itself
 */
export function getSmartJSStatus(websiteUrl: string): 'active' | 'inactive' | 'error' {
  try {
    // Normalize the URL
    const url = websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // SEOAgent domains - we know seoagent.js is installed
    const seoAgentDomains = [
      'seoagent.com',
      'www.seoagent.com',
      'localhost:3001',
      'localhost:3000'
    ];
    
    // Check if this is a SEOAgent domain
    if (seoAgentDomains.some(domain => url.includes(domain))) {
      return 'active';
    }
    
    // For other domains, default to inactive (can be enhanced later with real checking)
    return 'inactive';
    
  } catch (error) {
    console.error('[SEOAGENT.JS STATUS] Error checking status for', websiteUrl, ':', error);
    return 'error';
  }
}

/**
 * Check seoagent.js status for multiple websites
 */
export function getMultipleSmartJSStatus(websites: { id: string; url: string }[]): Map<string, 'active' | 'inactive' | 'error'> {
  const statusMap = new Map<string, 'active' | 'inactive' | 'error'>();
  
  websites.forEach(website => {
    const status = getSmartJSStatus(website.url);
    statusMap.set(website.id, status);
  });
  
  return statusMap;
}