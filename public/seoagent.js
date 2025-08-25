// SEOAgent.js - SEO Metrics Auto-tagging System
// This script automatically generates alt-tags for images and meta-tags for pages

// Configuration - Global scope so functions can access them
const API_BASE_URL = 'https://kfbuflsjbkncehtmykhj.supabase.co/functions/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYnVmbHNqYmtuY2VodG15a2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwOTEyNjMsImV4cCI6MjA2NzY2NzI2M30.KLL2E7h36GTQdJszVUcjToBnQZtRruFfm0TYjkBaAJg';

// Prevent double-execution
let seoMetricsInitialized = false;

// Initialize SEO Metrics - handles multiple loading states
function initializeSEOMetrics() {
    // Prevent double-execution
    if (seoMetricsInitialized) {
        console.log('[SEO-METRICS] Already initialized, skipping...');
        return;
    }

    // Check if idv (website token) is defined
    if (typeof idv === 'undefined') {
        console.error('SEO Metrics: Website token (idv) is not defined');
        return;
    }

    console.log('[SEO-METRICS] Smart.js initializing...');
    console.log('[SEO-METRICS] API Base URL:', API_BASE_URL);
    console.log('[SEO-METRICS] Website token (idv):', idv);
    console.log('[SEO-METRICS] Current page URL:', window.location.href);
    console.log('[SEO-METRICS] User agent:', navigator.userAgent);
    console.log('[SEO-METRICS] Page title:', document.title);
    console.log('[SEO-METRICS] Document ready state:', document.readyState);

    // Mark as initialized
    seoMetricsInitialized = true;

    // Process meta tags
    processMetaTags();
    
    // Process images
    processImages();
    
    // Process schema markup
    processSchemaMarkup();
    
    // Process canonical tags
    processCanonicalTags();
    
    // Process Open Graph tags
    processOpenGraphTags();
    
    // Note: sitemap.xml and robots.txt now require server-side deployment via hosting provider integrations
    // Dynamic serving via JavaScript cannot be accessed by search engine crawlers
    
    // Initialize SEO watchdog system
    initializeSEOWatchdog();
    
    // Add SEOAgent attribution (for backlink building)
    addSEOAgentAttribution();
}

// Handle multiple loading scenarios
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
    console.log('[SEO-METRICS] DOM still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', initializeSEOMetrics);
    
    // Fallback timeout in case DOMContentLoaded never fires
    setTimeout(function() {
        if (!seoMetricsInitialized) {
            console.log('[SEO-METRICS] Fallback timeout triggered, initializing...');
            initializeSEOMetrics();
        }
    }, 5000); // 5 second fallback
} else {
    // DOM is already loaded (interactive or complete)
    console.log('[SEO-METRICS] DOM already loaded, initializing immediately...');
    initializeSEOMetrics();
}

async function processMetaTags() {
    try {
        console.log('[SEO-METRICS] Starting meta tags processing');
        
        // Verify API configuration is available
        if (!API_BASE_URL || !ANON_KEY) {
            console.error('[SEO-METRICS] API configuration not available');
            return;
        }
        
        // Get current page URL
        const currentUrl = window.location.href;
        console.log(`[SEO-METRICS] Current URL: ${currentUrl}`);
        console.log(`[SEO-METRICS] Website token: ${idv}`);
        
        // Call the generate-meta-tags API
        console.log('[SEO-METRICS] Calling generate-meta-tags API');
        const response = await fetch(`${API_BASE_URL}/generate-meta-tags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ANON_KEY}`
            },
            body: JSON.stringify({
                url: currentUrl,
                id: idv
            })
        });

        console.log(`[SEO-METRICS] Meta tags API response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[SEO-METRICS] Meta tags API error: ${response.status} - ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const metaData = await response.json();
        console.log('[SEO-METRICS] Meta tags API response:', metaData);

        // Update meta tags if we got data
        if (metaData.title || metaData.description) {
            console.log('[SEO-METRICS] Updating meta tags in DOM');
            updateMetaTags(metaData.title, metaData.description);
        } else {
            console.log('[SEO-METRICS] No meta tags to update - empty response');
        }

        console.log('[SEO-METRICS] Meta tags processed successfully', {
            title: metaData.title,
            description: metaData.description,
            pageUrl: currentUrl,
            websiteToken: idv
        });

    } catch (error) {
        console.error('[SEO-METRICS] Error processing meta tags:', error);
        console.error('[SEO-METRICS] Meta tags error details:', {
            error: error.message,
            stack: error.stack,
            pageUrl: currentUrl,
            websiteToken: idv,
            apiUrl: `${API_BASE_URL}/generate-meta-tags`
        });
    }
}

async function processImages() {
    try {
        console.log('[SEO-METRICS] Starting image processing');
        
        // Verify API configuration is available
        if (!API_BASE_URL || !ANON_KEY) {
            console.error('[SEO-METRICS] API configuration not available');
            return;
        }
        
        // Find all img elements in the document
        const images = document.getElementsByTagName('img');
        console.log(`[SEO-METRICS] Found ${images.length} total img elements`);
        
        // Convert HTMLCollection to Array and filter out SVG images
        const imageUrls = Array.from(images)
            .filter(img => {
                // Check if the src ends with .svg
                const isSvgExtension = img.src.toLowerCase().endsWith('.svg');
                // Check if the image type contains 'svg'
                const isSvgType = img.getAttribute('type')?.toLowerCase().includes('svg') || false;
                
                return !isSvgExtension && !isSvgType && img.src;
            })
            .map(img => img.src);

        console.log(`[SEO-METRICS] Filtered to ${imageUrls.length} non-SVG images`);

        if (imageUrls.length === 0) {
            console.log('[SEO-METRICS] No images found to process');
            return;
        }

        console.log('[SEO-METRICS] Image URLs to process:', imageUrls);
        console.log(`[SEO-METRICS] Website token: ${idv}`);

        // Call the generate-image-alt API
        console.log('[SEO-METRICS] Calling generate-image-alt API');
        const response = await fetch(`${API_BASE_URL}/generate-image-alt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ANON_KEY}`
            },
            body: JSON.stringify({
                id: idv,
                images: imageUrls
            })
        });

        console.log(`[SEO-METRICS] Alt tags API response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[SEO-METRICS] Alt tags API error: ${response.status} - ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const altTags = await response.json();
        console.log('[SEO-METRICS] Alt tags API response:', altTags);

        // Update alt attributes for each image
        let updatedCount = 0;
        Array.from(images)
            .filter(img => !img.src.toLowerCase().endsWith('.svg') && 
                          !img.getAttribute('type')?.toLowerCase().includes('svg'))
            .forEach(img => {
                const imgUrl = img.src;
                if (altTags[imgUrl]) {
                    img.alt = altTags[imgUrl];
                    updatedCount++;
                    console.log(`[SEO-METRICS] Updated alt tag for ${imgUrl}: ${altTags[imgUrl]}`);
                } else {
                    console.log(`[SEO-METRICS] No alt tag received for ${imgUrl}`);
                }
            });

        console.log(`[SEO-METRICS] Updated ${updatedCount} out of ${imageUrls.length} images with alt tags`);
        console.log('[SEO-METRICS] Image processing completed', {
            totalImages: images.length,
            processedImages: imageUrls.length,
            updatedImages: updatedCount,
            websiteToken: idv
        });

    } catch (error) {
        console.error('[SEO-METRICS] Error processing images:', error);
        console.error('[SEO-METRICS] Image processing error details:', {
            error: error.message,
            stack: error.stack,
            totalImages: document.getElementsByTagName('img').length,
            websiteToken: idv,
            apiUrl: `${API_BASE_URL}/generate-image-alt`
        });
    }
}

function updateMetaTags(title, description) {
    // Update meta title
    if (title) {
        // Find existing meta title tag
        let metaTitle = document.querySelector('meta[name="title"]');
        if (!metaTitle) {
            metaTitle = document.createElement('meta');
            metaTitle.setAttribute('name', 'title');
            document.head.appendChild(metaTitle);
        }
        metaTitle.setAttribute('content', title);

        // Also update the page title
        document.title = title;
    }

    // Update meta description
    if (description) {
        // Find existing meta description tag
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.setAttribute('name', 'description');
            document.head.appendChild(metaDescription);
        }
        metaDescription.setAttribute('content', description);
    }
}

async function processSchemaMarkup() {
    try {
        console.log('[SEO-METRICS] Starting schema markup processing');
        
        if (!API_BASE_URL || !ANON_KEY) {
            console.error('[SEO-METRICS] API configuration not available');
            return;
        }
        
        // Check if schema markup already exists
        const existingSchema = document.querySelectorAll('script[type="application/ld+json"]');
        console.log(`[SEO-METRICS] Found ${existingSchema.length} existing schema markup blocks`);
        
        // Analyze page content for schema opportunities
        const pageData = {
            url: window.location.href,
            title: document.title,
            description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent),
            images: Array.from(document.getElementsByTagName('img'))
                .filter(img => !img.src.toLowerCase().endsWith('.svg'))
                .map(img => img.src),
            hasContactInfo: !!(document.querySelector('[itemtype*="Organization"]') || 
                            document.querySelector('address') || 
                            document.querySelector('[href^="mailto:"]') || 
                            document.querySelector('[href^="tel:"]')),
            hasArticleContent: !!(document.querySelector('article') || 
                               document.querySelector('.post') || 
                               document.querySelector('.article') ||
                               document.querySelector('main')),
            hasBreadcrumbs: !!(document.querySelector('.breadcrumb') || 
                             document.querySelector('[itemtype*="BreadcrumbList"]')),
            hasProducts: !!(document.querySelector('.product') || 
                          document.querySelector('[itemtype*="Product"]')),
            hasEvents: !!(document.querySelector('.event') || 
                        document.querySelector('[itemtype*="Event"]')),
            hasReviews: !!(document.querySelector('.review') || 
                         document.querySelector('[itemtype*="Review"]'))
        };
        
        console.log('[SEO-METRICS] Page analysis for schema:', pageData);
        
        // Call schema generation API
        const response = await fetch(`${API_BASE_URL}/generate-schema-markup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ANON_KEY}`
            },
            body: JSON.stringify({
                id: idv,
                pageData: pageData,
                existingSchemaCount: existingSchema.length
            })
        });
        
        console.log(`[SEO-METRICS] Schema API response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[SEO-METRICS] Schema API error: ${response.status} - ${errorText}`);
            return;
        }
        
        const schemaData = await response.json();
        console.log('[SEO-METRICS] Schema API response:', schemaData);
        
        // Inject schema markup if provided
        if (schemaData.schemas && schemaData.schemas.length > 0) {
            schemaData.schemas.forEach((schema, index) => {
                const scriptElement = document.createElement('script');
                scriptElement.type = 'application/ld+json';
                scriptElement.textContent = JSON.stringify(schema, null, 2);
                scriptElement.setAttribute('data-seoagent', 'auto-generated');
                document.head.appendChild(scriptElement);
                
                console.log(`[SEO-METRICS] Injected schema markup ${index + 1}:`, schema['@type']);
            });
            
            console.log(`[SEO-METRICS] Successfully injected ${schemaData.schemas.length} schema markup blocks`);
        } else {
            console.log('[SEO-METRICS] No schema markup to inject');
        }
        
    } catch (error) {
        console.error('[SEO-METRICS] Error processing schema markup:', error);
    }
}

async function processCanonicalTags() {
    try {
        console.log('[SEO-METRICS] Starting advanced canonical & hreflang processing');
        
        const currentUrl = window.location.href;
        const existingCanonical = document.querySelector('link[rel="canonical"]');
        const existingHreflang = document.querySelectorAll('link[rel="alternate"][hreflang]');
        
        console.log(`[SEO-METRICS] Current URL: ${currentUrl}`);
        console.log(`[SEO-METRICS] Existing canonical: ${existingCanonical?.href || 'none'}`);
        console.log(`[SEO-METRICS] Existing hreflang tags: ${existingHreflang.length}`);
        
        // Enhanced canonical logic
        await processAdvancedCanonical(currentUrl, existingCanonical);
        
        // Process hreflang automation
        await processHreflangTags(currentUrl, existingHreflang);
        
    } catch (error) {
        console.error('[SEO-METRICS] Error processing canonical/hreflang tags:', error);
    }
}

async function processAdvancedCanonical(currentUrl, existingCanonical) {
    const urlObj = new URL(currentUrl);
    
    // Enhanced canonical detection
    const needsCanonical = !!(
        urlObj.search || // Has query parameters
        urlObj.hash || // Has fragment
        urlObj.pathname.endsWith('/index.html') || // Index files
        urlObj.pathname.includes('//') || // Double slashes
        urlObj.pathname !== urlObj.pathname.toLowerCase() || // Mixed case
        currentUrl.includes('utm_') || // UTM parameters
        currentUrl.includes('fbclid') || // Facebook click ID
        currentUrl.includes('gclid') || // Google click ID
        currentUrl.includes('ref=') || // Reference parameters
        currentUrl.includes('source=') // Source tracking
    );
    
    if (!existingCanonical && needsCanonical) {
        // Create clean canonical URL with advanced cleaning
        let cleanPath = urlObj.pathname;
        
        // Remove index.html
        cleanPath = cleanPath.replace(/\/index\.html$/, '/');
        
        // Normalize trailing slashes
        if (cleanPath !== '/' && cleanPath.endsWith('/')) {
            cleanPath = cleanPath.slice(0, -1);
        }
        
        // Convert to lowercase for consistency
        cleanPath = cleanPath.toLowerCase();
        
        const cleanUrl = `${urlObj.protocol}//${urlObj.hostname}${cleanPath}`;
        
        const canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        canonicalLink.href = cleanUrl;
        canonicalLink.setAttribute('data-seoagent', 'auto-generated');
        document.head.appendChild(canonicalLink);
        
        console.log(`[SEO-METRICS] Added canonical tag: ${cleanUrl}`);
    } else if (existingCanonical) {
        console.log('[SEO-METRICS] Canonical tag already exists');
        
        // Validate existing canonical
        const canonicalUrl = existingCanonical.href;
        if (canonicalUrl) {
            console.log('[SEO-METRICS] Existing canonical validated');
        }
    } else {
        console.log('[SEO-METRICS] No canonical tag needed');
    }
}

async function processHreflangTags(currentUrl, existingHreflang) {
    try {
        // Skip hreflang if already exists
        if (existingHreflang.length > 0) {
            console.log('[SEO-METRICS] Hreflang tags already exist, skipping automation');
            return;
        }
        
        // Auto-detect language from various sources
        const detectedLanguage = detectPageLanguage();
        if (!detectedLanguage) {
            console.log('[SEO-METRICS] Could not detect page language, skipping hreflang');
            return;
        }
        
        console.log(`[SEO-METRICS] Detected page language: ${detectedLanguage}`);
        
        // Check if this looks like a multi-language site
        const isMultiLanguageSite = checkForMultiLanguageSite();
        
        if (isMultiLanguageSite) {
            console.log('[SEO-METRICS] Multi-language site detected, generating hreflang tags');
            await generateHreflangTags(currentUrl, detectedLanguage);
        } else {
            console.log('[SEO-METRICS] Single language site, adding self-referencing hreflang');
            addSelfReferencingHreflang(currentUrl, detectedLanguage);
        }
        
    } catch (error) {
        console.error('[SEO-METRICS] Error processing hreflang tags:', error);
    }
}

function detectPageLanguage() {
    // Try multiple methods to detect language
    const htmlLang = document.documentElement.getAttribute('lang');
    if (htmlLang) return htmlLang.toLowerCase();
    
    const contentLang = document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content');
    if (contentLang) return contentLang.toLowerCase();
    
    const ogLocale = document.querySelector('meta[property="og:locale"]')?.getAttribute('content');
    if (ogLocale) return ogLocale.toLowerCase().replace('_', '-');
    
    // Try to detect from URL patterns
    const urlPath = window.location.pathname;
    const langPatterns = [
        /^\/([a-z]{2})(-[a-z]{2})?\//, // /en/, /en-us/
        /^\/([a-z]{2})(-[a-z]{2})?$/, // /en, /en-us
    ];
    
    for (const pattern of langPatterns) {
        const match = urlPath.match(pattern);
        if (match) return match[1];
    }
    
    // Default to English if nothing found
    return 'en';
}

function checkForMultiLanguageSite() {
    // Look for language indicators in navigation, links, or content
    const languageIndicators = [
        'language-switch', 'lang-switch', 'language-selector',
        'translate', 'languages', 'idiomas', 'sprache', 'langue'
    ];
    
    // Check for language switching elements
    for (const indicator of languageIndicators) {
        if (document.querySelector(`[class*="${indicator}"], [id*="${indicator}"]`)) {
            return true;
        }
    }
    
    // Check for multiple language links in navigation
    const navLinks = Array.from(document.querySelectorAll('nav a, header a, .menu a'));
    const langCodes = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'ru'];
    let langLinksFound = 0;
    
    navLinks.forEach(link => {
        const href = link.href;
        langCodes.forEach(code => {
            if (href.includes(`/${code}/`) || href.includes(`/${code}`)) {
                langLinksFound++;
            }
        });
    });
    
    return langLinksFound >= 2;
}

async function generateHreflangTags(currentUrl, detectedLanguage) {
    try {
        // For multi-language sites, try to discover other language versions
        const urlObj = new URL(currentUrl);
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        
        // Common language codes to check for
        const languageCodes = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'];
        
        // Check if current URL has language code in path
        let hasLangInPath = false;
        let basePath = urlObj.pathname;
        
        if (pathSegments.length > 0 && languageCodes.includes(pathSegments[0])) {
            hasLangInPath = true;
            basePath = '/' + pathSegments.slice(1).join('/');
        }
        
        // Generate hreflang for current page
        addHreflangTag(currentUrl, detectedLanguage);
        
        // If we detected language in path, generate alternatives
        if (hasLangInPath) {
            for (const langCode of languageCodes) {
                if (langCode !== detectedLanguage) {
                    const altUrl = `${urlObj.protocol}//${urlObj.hostname}/${langCode}${basePath}`;
                    addHreflangTag(altUrl, langCode);
                }
            }
            
            // Add x-default
            const defaultUrl = `${urlObj.protocol}//${urlObj.hostname}${basePath}`;
            addHreflangTag(defaultUrl, 'x-default');
        }
        
    } catch (error) {
        console.error('[SEO-METRICS] Error generating hreflang tags:', error);
    }
}

function addSelfReferencingHreflang(currentUrl, language) {
    addHreflangTag(currentUrl, language);
}

function addHreflangTag(href, hreflang) {
    const hreflangLink = document.createElement('link');
    hreflangLink.rel = 'alternate';
    hreflangLink.hreflang = hreflang;
    hreflangLink.href = href;
    hreflangLink.setAttribute('data-seoagent', 'auto-generated');
    document.head.appendChild(hreflangLink);
    
    console.log(`[SEO-METRICS] Added hreflang tag: ${hreflang} -> ${href}`);
}

async function processOpenGraphTags() {
    try {
        console.log('[SEO-METRICS] Starting Open Graph tags processing');
        
        const existingOgTags = {
            title: document.querySelector('meta[property="og:title"]'),
            description: document.querySelector('meta[property="og:description"]'),
            image: document.querySelector('meta[property="og:image"]'),
            url: document.querySelector('meta[property="og:url"]'),
            type: document.querySelector('meta[property="og:type"]'),
            siteName: document.querySelector('meta[property="og:site_name"]')
        };
        
        console.log('[SEO-METRICS] Existing OG tags:', Object.keys(existingOgTags).filter(key => existingOgTags[key]));
        
        // Get page data for OG tag generation
        const pageTitle = document.title;
        const pageDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        const firstImage = document.querySelector('img:not([src$=".svg"])')?.src;
        
        // Add missing essential OG tags
        if (!existingOgTags.title && pageTitle) {
            const ogTitle = document.createElement('meta');
            ogTitle.setAttribute('property', 'og:title');
            ogTitle.setAttribute('content', pageTitle);
            ogTitle.setAttribute('data-seoagent', 'auto-generated');
            document.head.appendChild(ogTitle);
            console.log(`[SEO-METRICS] Added og:title: ${pageTitle}`);
        }
        
        if (!existingOgTags.description && pageDescription) {
            const ogDescription = document.createElement('meta');
            ogDescription.setAttribute('property', 'og:description');
            ogDescription.setAttribute('content', pageDescription);
            ogDescription.setAttribute('data-seoagent', 'auto-generated');
            document.head.appendChild(ogDescription);
            console.log(`[SEO-METRICS] Added og:description: ${pageDescription.substring(0, 50)}...`);
        }
        
        if (!existingOgTags.url) {
            const ogUrl = document.createElement('meta');
            ogUrl.setAttribute('property', 'og:url');
            ogUrl.setAttribute('content', window.location.href);
            ogUrl.setAttribute('data-seoagent', 'auto-generated');
            document.head.appendChild(ogUrl);
            console.log(`[SEO-METRICS] Added og:url: ${window.location.href}`);
        }
        
        if (!existingOgTags.type) {
            const ogType = document.createElement('meta');
            ogType.setAttribute('property', 'og:type');
            ogType.setAttribute('content', 'website');
            ogType.setAttribute('data-seoagent', 'auto-generated');
            document.head.appendChild(ogType);
            console.log('[SEO-METRICS] Added og:type: website');
        }
        
        if (!existingOgTags.image && firstImage) {
            const ogImage = document.createElement('meta');
            ogImage.setAttribute('property', 'og:image');
            ogImage.setAttribute('content', firstImage);
            ogImage.setAttribute('data-seoagent', 'auto-generated');
            document.head.appendChild(ogImage);
            console.log(`[SEO-METRICS] Added og:image: ${firstImage}`);
        }
        
        // Add Twitter Card tags for better social sharing
        if (!document.querySelector('meta[name="twitter:card"]')) {
            const twitterCard = document.createElement('meta');
            twitterCard.setAttribute('name', 'twitter:card');
            twitterCard.setAttribute('content', 'summary_large_image');
            twitterCard.setAttribute('data-seoagent', 'auto-generated');
            document.head.appendChild(twitterCard);
            console.log('[SEO-METRICS] Added twitter:card');
        }
        
        console.log('[SEO-METRICS] Open Graph tags processing completed');
        
    } catch (error) {
        console.error('[SEO-METRICS] Error processing Open Graph tags:', error);
    }
}

// setupSitemapHandler removed - dynamic sitemap serving not accessible to search crawlers

// checkForSitemapRoute removed - client-side route detection not accessible to search crawlers

// serveSitemap removed - document manipulation not accessible to search crawlers

// ==========================================
// HOSTING PROVIDER INTEGRATION - SITEMAP & ROBOTS  
// ==========================================
// Note: robots.txt and sitemap.xml now require server-side deployment
// Dynamic serving via JavaScript cannot be accessed by search engine crawlers
// See hosting provider integrations for automated setup


// fetchRobotsFromAPI removed - dynamic robots serving not accessible to search crawlers

// generateBasicRobotsContent removed - dynamic robots serving not accessible to search crawlers

// setupRobotsServiceWorker removed - service workers cannot serve robots.txt to search crawlers

// setupRobotsInterception removed - History API cannot serve robots.txt to search crawlers

// checkForRobotsRoute removed - client-side route detection not accessible to search crawlers

// ==========================================
// SEO WATCHDOG SYSTEM - CONTENTKING LITE
// ==========================================

// Global watchdog state
let seoWatchdogActive = false;
let seoBaseline = {};
let mutationObserver = null;
let watchdogCheckInterval = null;

async function initializeSEOWatchdog() {
    try {
        if (seoWatchdogActive) {
            console.log('[SEO-WATCHDOG] Already initialized, skipping...');
            return;
        }
        
        console.log('[SEO-WATCHDOG] 🔍 Initializing SEO monitoring system...');
        
        // Establish SEO baseline
        await establishSEOBaseline();
        
        // Start DOM monitoring
        startDOMMutationObserver();
        
        // Start indexability monitoring
        await startIndexabilityMonitoring();
        
        // Start periodic checks
        startPeriodicSEOChecks();
        
        seoWatchdogActive = true;
        console.log('[SEO-WATCHDOG] ✅ SEO watchdog system fully initialized');
        
    } catch (error) {
        console.error('[SEO-WATCHDOG] Error initializing watchdog:', error);
    }
}

async function establishSEOBaseline() {
    console.log('[SEO-WATCHDOG] 📊 Establishing SEO baseline...');
    
    const baseline = {
        timestamp: Date.now(),
        url: window.location.href,
        title: document.title || '',
        h1: document.querySelector('h1')?.textContent || '',
        h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent),
        metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        metaRobots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
        canonical: document.querySelector('link[rel="canonical"]')?.href || '',
        hreflang: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map(link => ({
            hreflang: link.getAttribute('hreflang'),
            href: link.href
        })),
        schemaCount: document.querySelectorAll('script[type="application/ld+json"]').length,
        schemaTypes: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(script => {
            try {
                const schema = JSON.parse(script.textContent);
                return schema['@type'] || 'Unknown';
            } catch (e) {
                return 'Invalid';
            }
        }),
        ogTags: {
            title: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
            description: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
            image: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
            url: document.querySelector('meta[property="og:url"]')?.getAttribute('content') || ''
        }
    };
    
    // Store baseline in localStorage and memory
    const storageKey = `seoagent_baseline_${idv}`;
    try {
        localStorage.setItem(storageKey, JSON.stringify(baseline));
    } catch (e) {
        console.warn('[SEO-WATCHDOG] Could not store baseline in localStorage:', e);
    }
    
    seoBaseline = baseline;
    console.log('[SEO-WATCHDOG] ✅ Baseline established:', baseline);
}

function startDOMMutationObserver() {
    console.log('[SEO-WATCHDOG] 👀 Starting DOM mutation observer...');
    
    if (mutationObserver) {
        mutationObserver.disconnect();
    }
    
    mutationObserver = new MutationObserver((mutations) => {
        let criticalChange = false;
        
        mutations.forEach((mutation) => {
            // Check for title changes
            if (mutation.target.nodeName === 'TITLE' || 
                (mutation.target === document.head && mutation.addedNodes.length > 0)) {
                
                const newTitle = document.title;
                if (newTitle !== seoBaseline.title) {
                    handleSEOChange('title_change', 'warning', 'content', {
                        title: 'Page title changed',
                        oldValue: seoBaseline.title,
                        newValue: newTitle,
                        selector: 'title'
                    });
                    seoBaseline.title = newTitle;
                    criticalChange = true;
                }
            }
            
            // Check for H1 changes
            if (mutation.target.nodeName === 'H1' || 
                (mutation.type === 'childList' && mutation.target.querySelector && mutation.target.querySelector('h1'))) {
                
                const newH1 = document.querySelector('h1')?.textContent || '';
                if (newH1 !== seoBaseline.h1) {
                    handleSEOChange('h1_change', 'warning', 'content', {
                        title: 'H1 heading changed',
                        oldValue: seoBaseline.h1,
                        newValue: newH1,
                        selector: 'h1'
                    });
                    seoBaseline.h1 = newH1;
                    criticalChange = true;
                }
            }
            
            // Check for meta robots changes
            if (mutation.target.name === 'robots' || 
                (mutation.addedNodes && Array.from(mutation.addedNodes).some(node => 
                    node.name === 'robots' || (node.getAttribute && node.getAttribute('name') === 'robots')))) {
                
                const newMetaRobots = document.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
                if (newMetaRobots !== seoBaseline.metaRobots) {
                    const isNoIndex = newMetaRobots.toLowerCase().includes('noindex');
                    const wasNoIndex = seoBaseline.metaRobots.toLowerCase().includes('noindex');
                    
                    handleSEOChange('meta_robots_change', isNoIndex ? 'critical' : 'warning', 'indexability', {
                        title: isNoIndex ? '🚨 Page went NOINDEX!' : 'Meta robots directive changed',
                        oldValue: seoBaseline.metaRobots,
                        newValue: newMetaRobots,
                        selector: 'meta[name="robots"]'
                    });
                    seoBaseline.metaRobots = newMetaRobots;
                    criticalChange = true;
                }
            }
            
            // Check for schema markup removal
            if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                Array.from(mutation.removedNodes).forEach(node => {
                    if (node.type === 'application/ld+json') {
                        handleSEOChange('schema_removed', 'warning', 'technical', {
                            title: 'Schema markup was removed',
                            oldValue: 'Schema script present',
                            newValue: 'Schema script removed',
                            selector: 'script[type="application/ld+json"]'
                        });
                        criticalChange = true;
                    }
                });
            }
            
            // Check for canonical changes
            if (mutation.target.rel === 'canonical' || 
                (mutation.addedNodes && Array.from(mutation.addedNodes).some(node => 
                    node.rel === 'canonical'))) {
                
                const newCanonical = document.querySelector('link[rel="canonical"]')?.href || '';
                if (newCanonical !== seoBaseline.canonical) {
                    handleSEOChange('canonical_change', 'warning', 'technical', {
                        title: 'Canonical URL changed',
                        oldValue: seoBaseline.canonical,
                        newValue: newCanonical,
                        selector: 'link[rel="canonical"]'
                    });
                    seoBaseline.canonical = newCanonical;
                    criticalChange = true;
                }
            }
        });
        
        // If we detected critical changes, also check indexability
        if (criticalChange) {
            setTimeout(() => checkIndexabilityStatus(), 1000);
        }
    });
    
    // Start observing
    mutationObserver.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true
    });
    
    console.log('[SEO-WATCHDOG] ✅ DOM mutation observer active');
}

async function startIndexabilityMonitoring() {
    console.log('[SEO-WATCHDOG] 🔍 Starting indexability monitoring...');
    
    try {
        await checkIndexabilityStatus();
        console.log('[SEO-WATCHDOG] ✅ Initial indexability check completed');
    } catch (error) {
        console.error('[SEO-WATCHDOG] Error in initial indexability check:', error);
    }
}

async function checkIndexabilityStatus() {
    try {
        // Check meta robots
        const metaRobots = document.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
        const hasNoIndex = metaRobots.toLowerCase().includes('noindex');
        const hasNoFollow = metaRobots.toLowerCase().includes('nofollow');
        
        if (hasNoIndex && !seoBaseline.metaRobots.toLowerCase().includes('noindex')) {
            handleSEOChange('noindex_detected', 'critical', 'indexability', {
                title: '🚨 CRITICAL: Page is NOINDEX!',
                description: 'This page cannot be indexed by search engines',
                newValue: metaRobots,
                selector: 'meta[name="robots"]'
            });
        }
        
        // Check canonical consistency
        const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
        if (canonical && canonical !== window.location.href) {
            const url1 = new URL(canonical);
            const url2 = new URL(window.location.href);
            
            // Check if they're significantly different (not just protocol/trailing slash)
            if (url1.hostname !== url2.hostname || url1.pathname.replace(/\/$/, '') !== url2.pathname.replace(/\/$/, '')) {
                handleSEOChange('canonical_mismatch', 'warning', 'technical', {
                    title: 'Canonical URL points to different page',
                    description: 'Current page canonical points to a different URL',
                    oldValue: window.location.href,
                    newValue: canonical,
                    selector: 'link[rel="canonical"]'
                });
            }
        }
        
        // Call backend robots status API for more detailed analysis
        if (API_BASE_URL && ANON_KEY) {
            try {
                const response = await fetch(`https://www.seoagent.com/api/gsc/robots-status?userToken=${idv}&siteUrl=${encodeURIComponent(window.location.origin)}`, {
                    method: 'GET'
                });
                
                if (response.ok) {
                    const robotsData = await response.json();
                    if (robotsData.robots_txt_issues && robotsData.robots_txt_issues.length > 0) {
                        handleSEOChange('robots_txt_issue', 'warning', 'indexability', {
                            title: 'Robots.txt issues detected',
                            description: robotsData.robots_txt_issues.join(', '),
                            metadata: { robotsData }
                        });
                    }
                }
            } catch (e) {
                console.warn('[SEO-WATCHDOG] Could not fetch robots status from backend:', e);
            }
        }
        
    } catch (error) {
        console.error('[SEO-WATCHDOG] Error checking indexability:', error);
    }
}

function startPeriodicSEOChecks() {
    console.log('[SEO-WATCHDOG] ⏰ Starting periodic SEO checks...');
    
    // Check every 30 seconds for changes we might have missed
    watchdogCheckInterval = setInterval(async () => {
        try {
            await checkForMissedChanges();
        } catch (error) {
            console.error('[SEO-WATCHDOG] Error in periodic check:', error);
        }
    }, 30000);
}

async function checkForMissedChanges() {
    // Quick check to see if anything changed that MutationObserver missed
    const currentTitle = document.title;
    const currentH1 = document.querySelector('h1')?.textContent || '';
    const currentMetaRobots = document.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
    
    if (currentTitle !== seoBaseline.title ||
        currentH1 !== seoBaseline.h1 ||
        currentMetaRobots !== seoBaseline.metaRobots) {
        
        console.log('[SEO-WATCHDOG] 🔍 Detected changes in periodic check, re-establishing baseline...');
        await establishSEOBaseline();
    }
}

async function handleSEOChange(eventType, severity, category, details) {
    console.log(`[SEO-WATCHDOG] ${severity.toUpperCase()}: ${eventType}`, details);
    
    const event = {
        user_token: idv,
        site_url: window.location.origin,
        page_url: window.location.href,
        event_type: eventType,
        severity: severity,
        category: category,
        title: details.title,
        description: details.description || '',
        old_value: details.oldValue || null,
        new_value: details.newValue || null,
        source: 'watchdog',
        metadata: {
            selector: details.selector || null,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            ...details.metadata
        }
    };
    
    // Try to send to backend
    try {
        if (API_BASE_URL && ANON_KEY) {
            await fetch(`https://www.seoagent.com/api/tools/seo-alert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            });
        }
    } catch (error) {
        console.warn('[SEO-WATCHDOG] Could not send event to backend:', error);
    }
    
    // Store locally as backup
    try {
        const storageKey = `seoagent_events_${idv}`;
        const existingEvents = JSON.parse(localStorage.getItem(storageKey) || '[]');
        existingEvents.push(event);
        
        // Keep only last 50 events to avoid storage bloat
        if (existingEvents.length > 50) {
            existingEvents.splice(0, existingEvents.length - 50);
        }
        
        localStorage.setItem(storageKey, JSON.stringify(existingEvents));
    } catch (e) {
        console.warn('[SEO-WATCHDOG] Could not store event locally:', e);
    }
    
    // Show console warning for critical issues
    if (severity === 'critical') {
        console.warn(`🚨 CRITICAL SEO ISSUE DETECTED: ${details.title}`);
        console.warn('Details:', details);
    }
}

async function addSEOAgentAttribution() {
    try {
        console.log('[SEO-METRICS] Checking attribution settings');
        
        // Check if attribution already exists
        if (document.querySelector('[data-seoagent="attribution"]')) {
            console.log('[SEO-METRICS] Attribution already exists, skipping');
            return;
        }

        // Check if attribution is enabled for this website
        try {
            const response = await fetch(`${API_BASE_URL}/check-attribution`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ANON_KEY}`
                },
                body: JSON.stringify({
                    website_token: idv
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (!data.attribution_enabled) {
                    console.log('[SEO-METRICS] Attribution disabled for this website, skipping');
                    return;
                }
            } else {
                console.log('[SEO-METRICS] Attribution check failed, proceeding with default (enabled)');
            }
        } catch (error) {
            console.log('[SEO-METRICS] Attribution check error, proceeding with default (enabled):', error);
        }

        console.log('[SEO-METRICS] Adding SEOAgent attribution link');
        
        // Try to find footer elements in order of preference
        const footerSelectors = [
            'footer',
            '.footer', 
            '#footer',
            '.site-footer',
            '[role="contentinfo"]',
            '.page-footer'
        ];
        
        let footerElement = null;
        for (const selector of footerSelectors) {
            footerElement = document.querySelector(selector);
            if (footerElement) {
                console.log(`[SEO-METRICS] Found footer element: ${selector}`);
                break;
            }
        }
        
        // If no footer found, try to append to body
        if (!footerElement) {
            console.log('[SEO-METRICS] No footer found, will append to body');
            footerElement = document.body;
        }
        
        if (!footerElement) {
            console.log('[SEO-METRICS] No suitable element found for attribution');
            return;
        }
        
        // Create attribution container
        const attributionContainer = document.createElement('div');
        attributionContainer.setAttribute('data-seoagent', 'attribution');
        attributionContainer.style.cssText = `
            margin: 8px 0;
            padding: 4px 0;
            font-size: 11px;
            line-height: 1.2;
            color: #666;
            text-align: center;
            border-top: 1px solid #eee;
        `;
        
        // Create the attribution link
        const attributionLink = document.createElement('a');
        attributionLink.href = 'https://seoagent.com';
        attributionLink.target = '_blank';
        attributionLink.rel = 'dofollow'; // Explicit dofollow for SEO benefit
        attributionLink.textContent = 'SEO by SEOAgent';
        attributionLink.style.cssText = `
            color: #666;
            text-decoration: none;
            font-size: 11px;
            opacity: 0.7;
            transition: opacity 0.2s ease;
        `;
        
        // Add hover effect
        attributionLink.addEventListener('mouseenter', function() {
            this.style.opacity = '1';
            this.style.color = '#333';
        });
        
        attributionLink.addEventListener('mouseleave', function() {
            this.style.opacity = '0.7';
            this.style.color = '#666';
        });
        
        // Assemble the attribution
        attributionContainer.appendChild(attributionLink);
        
        // Inject into footer (or body)
        if (footerElement === document.body) {
            // If appending to body, add some spacing
            attributionContainer.style.marginTop = '20px';
            footerElement.appendChild(attributionContainer);
        } else {
            // Try to append at the end of footer
            footerElement.appendChild(attributionContainer);
        }
        
        console.log('[SEO-METRICS] Successfully added SEOAgent attribution link');
        
        // Add schema markup for the attribution (credibility signal)
        const attributionSchema = {
            "@context": "https://schema.org",
            "@type": "Organization", 
            "name": "SEOAgent",
            "url": "https://seoagent.com",
            "description": "AI-powered SEO automation platform"
        };
        
        const schemaScript = document.createElement('script');
        schemaScript.type = 'application/ld+json';
        schemaScript.setAttribute('data-seoagent', 'attribution-schema');
        schemaScript.textContent = JSON.stringify(attributionSchema, null, 2);
        document.head.appendChild(schemaScript);
        
        console.log('[SEO-METRICS] Added SEOAgent attribution schema markup');
        
    } catch (error) {
        console.error('[SEO-METRICS] Error adding attribution:', error);
    }
}

// Add global error handler for this script
window.addEventListener('error', function(event) {
    if (event.filename && event.filename.includes('smart.js')) {
        console.error('SEO Metrics: Script error:', event.error);
    }
});

// Dynamic Sitemap Serving - CRITICAL for automation
// initializeSitemapServing removed - dynamic sitemap serving not accessible to search crawlers

// serveDynamicSitemap removed - dynamic generation not accessible to search crawlers

// generateAndServeSitemap removed - document manipulation not accessible to search crawlers

// fetchSitemapFromAPI removed - API responses not accessible to search crawlers via JavaScript

// generateBasicSitemap removed - document content replacement not accessible to search crawlers

// setupSitemapServiceWorker removed - service workers cannot serve sitemaps to search crawlers

// setupSitemapInterception removed - History API navigation not accessible to search crawlers

// Duplicate setupSitemapHandler removed - client-side detection not accessible to search crawlers

// Attribution handling for Free tier users
function handleAttribution() {
    // Check if attribution is required for this website
    const attributionApiUrl = 'https://seoagent.com/api/seoagent/check-attribution';
    
    fetch(`${attributionApiUrl}?token=${encodeURIComponent(idv)}`)
        .then(response => response.json())
        .then(data => {
            console.log('[SEO-METRICS] Attribution check result:', data);
            
            if (data.requireAttribution) {
                console.log('[SEO-METRICS] Free tier detected - adding attribution');
                addAttributionLink();
            } else {
                console.log('[SEO-METRICS] Paid tier detected - no attribution required');
            }
        })
        .catch(error => {
            console.error('[SEO-METRICS] Attribution check failed:', error);
            // Default to adding attribution on error (security)
            addAttributionLink();
        });
}

function addAttributionLink() {
    // Check if attribution already exists to prevent duplicates
    if (document.querySelector('[data-seoagent-attribution]')) {
        console.log('[SEO-METRICS] Attribution already exists, skipping');
        return;
    }

    // Create attribution element
    const attribution = document.createElement('div');
    attribution.setAttribute('data-seoagent-attribution', 'true');
    attribution.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 999999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        text-decoration: none;
        transition: opacity 0.3s;
    `;
    
    // Create link
    const link = document.createElement('a');
    link.href = 'https://seoagent.com/?utm_source=attribution&utm_medium=seoagent_js';
    link.target = '_blank';
    link.rel = 'noopener';
    link.style.cssText = 'color: #60a5fa; text-decoration: none;';
    link.textContent = '⚡ Powered by SEOAgent';
    
    attribution.appendChild(link);
    
    // Add hover effects
    attribution.addEventListener('mouseenter', () => {
        attribution.style.opacity = '0.7';
    });
    
    attribution.addEventListener('mouseleave', () => {
        attribution.style.opacity = '1';
    });
    
    // Add to page
    document.body.appendChild(attribution);
    console.log('[SEO-METRICS] Attribution link added successfully');
}

// Initialize attribution handling
if (typeof idv !== 'undefined') {
    handleAttribution();
}

console.log('SEO Metrics: SEOAgent.js loaded successfully - sitemap/robots now via hosting provider integrations');