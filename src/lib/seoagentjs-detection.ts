/**
 * SEOAgent.js Detection Utility
 * Checks if SEOAgent.js is properly installed and functioning on a website
 */

export interface SmartJSStatus {
  installed: boolean;
  active: boolean;
  scriptFound: boolean;
  idvFound: boolean;
  error?: string;
  lastChecked: Date;
}

/**
 * Check if smart.js is installed on a website by fetching the HTML and looking for the script
 */
export async function checkSmartJSInstallation(websiteUrl: string): Promise<SmartJSStatus> {
  const result: SmartJSStatus = {
    installed: false,
    active: false,
    scriptFound: false,
    idvFound: false,
    lastChecked: new Date()
  };

  try {
    // Ensure URL has protocol
    if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
      websiteUrl = 'https://' + websiteUrl;
    }

    // Fetch the website HTML with timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'SEOAgent-Bot/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      return result;
    }

    const html = await response.text();

    // Check for smart.js script tag
    const smartJSRegex = /<script[^>]*src\s*=\s*['"](.*?smart\.js.*?)['"][^>]*>/i;
    const smartJSMatch = html.match(smartJSRegex);
    
    if (smartJSMatch) {
      result.scriptFound = true;
      result.installed = true;
    }

    // Check for IDV configuration
    const idvRegex = /const\s+idv\s*=\s*['"`]([^'"`]+)['"`]/i;
    const idvMatch = html.match(idvRegex);
    
    if (idvMatch) {
      result.idvFound = true;
    }

    // Consider it active if both script and IDV are found
    result.active = result.scriptFound && result.idvFound;

    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

/**
 * Check smart.js status for multiple websites in parallel
 */
export async function checkMultipleWebsites(websites: { id: string; url: string }[]): Promise<Map<string, SmartJSStatus>> {
  const results = new Map<string, SmartJSStatus>();
  
  const promises = websites.map(async (website) => {
    const status = await checkSmartJSInstallation(website.url);
    results.set(website.id, status);
  });

  await Promise.allSettled(promises);
  return results;
}

/**
 * Convert SmartJSStatus to simple status string for UI
 */
export function getSimpleStatus(status: SmartJSStatus): 'active' | 'inactive' | 'error' {
  if (status.error) return 'error';
  if (status.active) return 'active';
  return 'inactive';
}