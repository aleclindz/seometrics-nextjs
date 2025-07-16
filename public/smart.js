// Smart.js - SEO Metrics Auto-tagging System
// This script automatically generates alt-tags for images and meta-tags for pages

// Configuration - Global scope so functions can access them
const API_BASE_URL = 'https://kfbuflsjbkncehtmykhj.supabase.co/functions/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYnVmbHNqYmtuY2VodG15a2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwOTEyNjMsImV4cCI6MjA2NzY2NzI2M30.KLL2E7h36GTQdJszVUcjToBnQZtRruFfm0TYjkBaAJg';

document.addEventListener('DOMContentLoaded', function() {
    // Check if idv (website token) is defined
    if (typeof idv === 'undefined') {
        console.error('SEO Metrics: Website token (idv) is not defined');
        return;
    }

    console.log('[SEO-METRICS] Smart.js initializing...');
    console.log('[SEO-METRICS] API Base URL:', API_BASE_URL);
    console.log('[SEO-METRICS] Website token (idv):', idv);

    // Process meta tags
    processMetaTags();
    
    // Process images
    processImages();
});

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

        console.log('SEO Metrics: Meta tags processed successfully', {
            title: metaData.title,
            description: metaData.description
        });

    } catch (error) {
        console.error('[SEO-METRICS] Error processing meta tags:', error);
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

    } catch (error) {
        console.error('[SEO-METRICS] Error processing images:', error);
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

// Add global error handler for this script
window.addEventListener('error', function(event) {
    if (event.filename && event.filename.includes('smart.js')) {
        console.error('SEO Metrics: Script error:', event.error);
    }
});

console.log('SEO Metrics: Smart.js loaded successfully');