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
        console.log('[SEO-METRICS] Starting canonical tags processing');
        
        const currentUrl = window.location.href;
        const existingCanonical = document.querySelector('link[rel="canonical"]');
        
        console.log(`[SEO-METRICS] Current URL: ${currentUrl}`);
        console.log(`[SEO-METRICS] Existing canonical: ${existingCanonical?.href || 'none'}`);
        
        // Check for common URL variations that need canonicalization
        const urlObj = new URL(currentUrl);
        const needsCanonical = !!(
            urlObj.search || // Has query parameters
            urlObj.hash || // Has fragment
            currentUrl.includes('://www.') !== currentUrl.includes('://') || // www vs non-www
            currentUrl.endsWith('/') !== (currentUrl.split('/').length === 3) // Trailing slash issues
        );
        
        if (!existingCanonical && needsCanonical) {
            // Create clean canonical URL
            const cleanUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
            
            const canonicalLink = document.createElement('link');
            canonicalLink.rel = 'canonical';
            canonicalLink.href = cleanUrl;
            canonicalLink.setAttribute('data-seoagent', 'auto-generated');
            document.head.appendChild(canonicalLink);
            
            console.log(`[SEO-METRICS] Added canonical tag: ${cleanUrl}`);
        } else if (existingCanonical) {
            console.log('[SEO-METRICS] Canonical tag already exists');
        } else {
            console.log('[SEO-METRICS] No canonical tag needed');
        }
        
    } catch (error) {
        console.error('[SEO-METRICS] Error processing canonical tags:', error);
    }
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

// Add global error handler for this script
window.addEventListener('error', function(event) {
    if (event.filename && event.filename.includes('smart.js')) {
        console.error('SEO Metrics: Script error:', event.error);
    }
});

console.log('SEO Metrics: Smart.js loaded successfully');