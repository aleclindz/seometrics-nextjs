// Smart.js - SEO Metrics Auto-tagging System
// This script automatically generates alt-tags for images and meta-tags for pages

document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const API_BASE_URL = 'https://jplhifgfzfxihdnvofkt.supabase.co/functions/v1';
    
    // Check if idv (website token) is defined
    if (typeof idv === 'undefined') {
        console.error('SEO Metrics: Website token (idv) is not defined');
        return;
    }

    // Process meta tags
    processMetaTags();
    
    // Process images
    processImages();
});

async function processMetaTags() {
    try {
        // Get current page URL
        const currentUrl = window.location.href;
        
        // Call the generate-meta-tags API
        const response = await fetch(`${API_BASE_URL}/generate-meta-tags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: currentUrl,
                id: idv
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const metaData = await response.json();

        // Update meta tags if we got data
        if (metaData.title || metaData.description) {
            updateMetaTags(metaData.title, metaData.description);
        }

        console.log('SEO Metrics: Meta tags processed', {
            title: metaData.title,
            description: metaData.description
        });

    } catch (error) {
        console.error('SEO Metrics: Error processing meta tags:', error);
    }
}

async function processImages() {
    try {
        // Find all img elements in the document
        const images = document.getElementsByTagName('img');
        
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

        if (imageUrls.length === 0) {
            console.log('SEO Metrics: No images found to process');
            return;
        }

        console.log('SEO Metrics: Found images (excluding SVGs):', imageUrls);
        console.log(`SEO Metrics: Total images found: ${imageUrls.length}`);

        // Call the generate-image-alt API
        const response = await fetch(`${API_BASE_URL}/generate-image-alt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: idv,
                images: imageUrls
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const altTags = await response.json();

        // Update alt attributes for each image
        Array.from(images)
            .filter(img => !img.src.toLowerCase().endsWith('.svg') && 
                          !img.getAttribute('type')?.toLowerCase().includes('svg'))
            .forEach(img => {
                const imgUrl = img.src;
                if (altTags[imgUrl]) {
                    img.alt = altTags[imgUrl];
                    console.log(`SEO Metrics: Added alt tag for ${imgUrl}: ${altTags[imgUrl]}`);
                }
            });

        console.log('SEO Metrics: Finished updating alt tags');

    } catch (error) {
        console.error('SEO Metrics: Error processing images:', error);
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