# 🧠 Smart.js Technical Documentation

This document provides comprehensive technical documentation for Smart.js (seoagent.js), the client-side SEO automation script that powers real-time optimization across websites.

## 📋 Smart.js Overview

**Smart.js** is a lightweight client-side JavaScript library that automatically optimizes websites for SEO by:
- Generating AI-powered meta tags
- Creating intelligent alt tags for images
- Injecting structured data (schema markup)
- Optimizing canonical tags and Open Graph metadata

### **Core Architecture**
```
Website HTML Page
       ↓
Smart.js Script Load (/public/seoagent.js)
       ↓
Initialization & Validation (idv token check)
       ↓
Parallel Processing Functions
       ├── processMetaTags()
       ├── processImages()  
       ├── processSchemaMarkup()
       ├── processCanonicalTags()
       └── processOpenGraphTags()
       ↓
Supabase Edge Functions
       ↓
OpenAI GPT-4 API
       ↓
Real-time DOM Updates
```

## 🔧 Technical Implementation

### **Script Configuration**
```javascript
// Global Configuration
const API_BASE_URL = 'https://kfbuflsjbkncehtmykhj.supabase.co/functions/v1'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// Website Token (Required)
// Must be defined before script execution
const idv = 'website-unique-identifier'
```

### **Initialization System**
```javascript
function initializeSEOMetrics() {
    // Double-execution prevention
    if (seoMetricsInitialized) return
    
    // Token validation
    if (typeof idv === 'undefined') {
        console.error('SEO Metrics: Website token (idv) is not defined')
        return
    }
    
    // Mark as initialized
    seoMetricsInitialized = true
    
    // Execute optimization functions in parallel
    processMetaTags()
    processImages()
    processSchemaMarkup()
    processCanonicalTags()
    processOpenGraphTags()
}
```

### **Loading Strategy**
Smart.js handles multiple loading scenarios:

```javascript
// DOM Loading States Handler
if (document.readyState === 'loading') {
    // Wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', initializeSEOMetrics)
    
    // 5-second fallback timeout
    setTimeout(() => {
        if (!seoMetricsInitialized) {
            initializeSEOMetrics()
        }
    }, 5000)
} else {
    // DOM already loaded - initialize immediately
    initializeSEOMetrics()
}
```

## 🏷️ Meta Tags Optimization

### **processMetaTags() Function**
Generates AI-powered meta titles and descriptions for pages.

```javascript
async function processMetaTags() {
    const currentUrl = window.location.href
    
    // API call to generate meta tags
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
    })
    
    const metaData = await response.json()
    updateMetaTags(metaData.title, metaData.description)
}
```

### **DOM Updates**
```javascript
function updateMetaTags(title, description) {
    // Update meta title tag
    if (title) {
        let metaTitle = document.querySelector('meta[name="title"]')
        if (!metaTitle) {
            metaTitle = document.createElement('meta')
            metaTitle.setAttribute('name', 'title')
            document.head.appendChild(metaTitle)
        }
        metaTitle.setAttribute('content', title)
        document.title = title // Also update page title
    }
    
    // Update meta description tag
    if (description) {
        let metaDescription = document.querySelector('meta[name="description"]')
        if (!metaDescription) {
            metaDescription = document.createElement('meta')
            metaDescription.setAttribute('name', 'description')
            document.head.appendChild(metaDescription)
        }
        metaDescription.setAttribute('content', description)
    }
}
```

## 🖼️ Image Alt Tag Generation

### **processImages() Function**
Automatically generates descriptive alt tags for images using AI.

```javascript
async function processImages() {
    // Find all img elements, filter out SVGs
    const images = Array.from(document.getElementsByTagName('img'))
        .filter(img => {
            const isSvgExtension = img.src.toLowerCase().endsWith('.svg')
            const isSvgType = img.getAttribute('type')?.toLowerCase().includes('svg')
            return !isSvgExtension && !isSvgType && img.src
        })
        .map(img => img.src)
    
    if (images.length === 0) return
    
    // API call for alt tag generation
    const response = await fetch(`${API_BASE_URL}/generate-image-alt`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify({
            id: idv,
            images: images
        })
    })
    
    const altTags = await response.json()
    
    // Update DOM with alt tags
    document.querySelectorAll('img').forEach(img => {
        if (!img.src.toLowerCase().endsWith('.svg') && altTags[img.src]) {
            img.alt = altTags[img.src]
        }
    })
}
```

## 🏗️ Schema Markup Generation

### **processSchemaMarkup() Function**
Analyzes page content and injects appropriate structured data.

```javascript
async function processSchemaMarkup() {
    // Analyze page content for schema opportunities
    const pageData = {
        url: window.location.href,
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent),
        images: Array.from(document.getElementsByTagName('img'))
            .filter(img => !img.src.toLowerCase().endsWith('.svg'))
            .map(img => img.src),
        
        // Content type detection
        hasContactInfo: !!(document.querySelector('[itemtype*="Organization"]') || 
                          document.querySelector('address') || 
                          document.querySelector('[href^="mailto:"]')),
        hasArticleContent: !!(document.querySelector('article') || 
                            document.querySelector('.post')),
        hasBreadcrumbs: !!(document.querySelector('.breadcrumb')),
        hasProducts: !!(document.querySelector('.product')),
        hasEvents: !!(document.querySelector('.event')),
        hasReviews: !!(document.querySelector('.review'))
    }
    
    // Generate schema markup via API
    const response = await fetch(`${API_BASE_URL}/generate-schema-markup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify({
            id: idv,
            pageData: pageData,
            existingSchemaCount: document.querySelectorAll('script[type="application/ld+json"]').length
        })
    })
    
    const schemaData = await response.json()
    
    // Inject schema markup
    if (schemaData.schemas && schemaData.schemas.length > 0) {
        schemaData.schemas.forEach((schema, index) => {
            const scriptElement = document.createElement('script')
            scriptElement.type = 'application/ld+json'
            scriptElement.textContent = JSON.stringify(schema, null, 2)
            scriptElement.setAttribute('data-seoagent', 'auto-generated')
            document.head.appendChild(scriptElement)
        })
    }
}
```

## 🔗 Canonical Tag Management

### **processCanonicalTags() Function**
Ensures proper canonical URL implementation.

```javascript
async function processCanonicalTags() {
    const currentUrl = window.location.href
    const existingCanonical = document.querySelector('link[rel="canonical"]')
    
    // Check for URL variations that need canonicalization
    const urlObj = new URL(currentUrl)
    const needsCanonical = !!(
        urlObj.search ||     // Has query parameters
        urlObj.hash ||       // Has fragment
        currentUrl.includes('://www.') !== currentUrl.includes('://') // www variations
    )
    
    if (!existingCanonical && needsCanonical) {
        // Create clean canonical URL
        const cleanUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`
        
        const canonicalLink = document.createElement('link')
        canonicalLink.rel = 'canonical'
        canonicalLink.href = cleanUrl
        canonicalLink.setAttribute('data-seoagent', 'auto-generated')
        document.head.appendChild(canonicalLink)
    }
}
```

## 📱 Open Graph Optimization

### **processOpenGraphTags() Function**
Generates Open Graph tags for social media sharing.

```javascript
async function processOpenGraphTags() {
    const existingOgTags = {
        title: document.querySelector('meta[property="og:title"]'),
        description: document.querySelector('meta[property="og:description"]'),
        image: document.querySelector('meta[property="og:image"]'),
        url: document.querySelector('meta[property="og:url"]'),
        type: document.querySelector('meta[property="og:type"]')
    }
    
    // Add missing essential OG tags
    const pageTitle = document.title
    const pageDescription = document.querySelector('meta[name="description"]')?.getAttribute('content')
    const firstImage = document.querySelector('img:not([src$=".svg"])')?.src
    
    if (!existingOgTags.title && pageTitle) {
        const ogTitle = document.createElement('meta')
        ogTitle.setAttribute('property', 'og:title')
        ogTitle.setAttribute('content', pageTitle)
        ogTitle.setAttribute('data-seoagent', 'auto-generated')
        document.head.appendChild(ogTitle)
    }
    
    // Similar logic for other OG tags...
    
    // Add Twitter Card tags
    if (!document.querySelector('meta[name="twitter:card"]')) {
        const twitterCard = document.createElement('meta')
        twitterCard.setAttribute('name', 'twitter:card')
        twitterCard.setAttribute('content', 'summary_large_image')
        twitterCard.setAttribute('data-seoagent', 'auto-generated')
        document.head.appendChild(twitterCard)
    }
}
```

## 🔍 Status Checking System

### **Smart.js Status Detection**
The platform includes a status checker that determines Smart.js installation status:

```typescript
// /src/lib/seoagent-js-status.ts
export function getSmartJSStatus(websiteUrl: string): 'active' | 'inactive' | 'error' {
    const url = websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    
    // Known SEOAgent domains
    const seoAgentDomains = [
        'seoagent.com',
        'www.seoagent.com', 
        'localhost:3001',
        'localhost:3000'
    ]
    
    if (seoAgentDomains.some(domain => url.includes(domain))) {
        return 'active'
    }
    
    return 'inactive' // Can be enhanced with real script detection
}
```

### **AI Agent Integration**
The AI Agent can check Smart.js status through function calling:

```typescript
// AI Agent Function
async function checkSmartJSStatus(args: { site_url: string }) {
    const response = await fetch(`/api/smartjs/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: args.site_url })
    })
    
    const result = await response.json()
    
    return {
        success: true,
        data: {
            site_url: args.site_url,
            smartjs_installed: result.data.installed,
            smartjs_active: result.data.active,
            script_found: result.data.scriptFound,
            features: {
                auto_meta_tags: result.data.active,
                auto_alt_tags: result.data.active,
                performance_tracking: result.data.active
            }
        }
    }
}
```

## 🚀 Performance & Optimization

### **Script Loading Optimization**
```javascript
// Efficient DOM queries
const images = Array.from(document.getElementsByTagName('img'))
const existingMeta = document.querySelectorAll('meta[name], meta[property]')

// Batch DOM updates
const fragment = document.createDocumentFragment()
// Add multiple elements to fragment
document.head.appendChild(fragment) // Single DOM operation
```

### **Error Handling**
```javascript
// Global error handler
window.addEventListener('error', function(event) {
    if (event.filename && event.filename.includes('smart.js')) {
        console.error('SEO Metrics: Script error:', event.error)
    }
})

// Function-level error handling
try {
    await processMetaTags()
} catch (error) {
    console.error('[SEO-METRICS] Error processing meta tags:', error)
    // Continue with other optimizations
}
```

## 📊 Monitoring & Analytics

### **Comprehensive Logging**
```javascript
console.log('[SEO-METRICS] Meta tags processed successfully', {
    title: metaData.title,
    description: metaData.description,
    pageUrl: currentUrl,
    websiteToken: idv
})

console.log(`[SEO-METRICS] Updated ${updatedCount} out of ${imageUrls.length} images with alt tags`)
```

### **Performance Metrics**
- Script initialization time
- API response times
- DOM update performance  
- Total optimization time

## 🔐 Security Considerations

### **Token Validation**
```javascript
// Validate website token before execution
if (typeof idv === 'undefined') {
    console.error('SEO Metrics: Website token (idv) is not defined')
    return
}
```

### **API Security**
- Bearer token authentication
- HTTPS-only API calls
- Input validation and sanitization
- Rate limiting on Supabase Edge Functions

## 🎯 Future Enhancements

### **Planned Features**
1. **Real-time Performance Monitoring**: Track optimization impact
2. **A/B Testing Integration**: Test different optimization strategies
3. **Advanced Schema Detection**: More sophisticated content analysis
4. **Multi-language Support**: International SEO optimization
5. **Custom Rule Engine**: User-defined optimization rules

### **Integration Roadmap**
1. **Enhanced AI Agent Integration**: Automated Smart.js management
2. **Cross-page Optimization**: Site-wide consistency
3. **Performance-based Adjustments**: ML-driven optimization tuning
4. **Advanced Analytics**: Detailed optimization reporting

This technical documentation provides a complete understanding of Smart.js functionality, implementation details, and integration points within the SEOAgent ecosystem.