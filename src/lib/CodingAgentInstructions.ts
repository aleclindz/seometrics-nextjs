export interface CodingAgentInstructions {
  issueTitle: string;
  problemDescription: string;
  technicalDetails: string;
  fixInstructions: string[];
  codeExamples: string;
  testingSteps: string[];
  expectedOutcome: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
}

export class CodingAgentInstructionsGenerator {
  static generate(issueType: string, issueTitle: string, affectedUrls?: string[]): CodingAgentInstructions | null {
    const instructionsMap: Record<string, CodingAgentInstructions> = {
      mobile_usability_issues: {
        issueTitle: 'Fix Mobile Usability Issues',
        problemDescription: 'Pages have mobile-unfriendly elements that hurt user experience and mobile search performance.',
        technicalDetails: `Mobile usability issues typically include:
- Content wider than screen
- Clickable elements too close together
- Viewport not set properly
- Text too small to read
- Flash usage (deprecated)`,
        fixInstructions: [
          'Add proper viewport meta tag to HTML head',
          'Ensure all clickable elements are at least 44px in size with adequate spacing',
          'Use responsive CSS units (rem, em, %, vw, vh) instead of fixed pixels',
          'Implement CSS media queries for different screen sizes',
          'Test touch target sizes and spacing',
          'Ensure text is readable without zooming (minimum 16px font size)'
        ],
        codeExamples: `<!-- Add to HTML head -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">

/* CSS for responsive design */
.button {
  min-width: 44px;
  min-height: 44px;
  margin: 8px;
  font-size: 16px;
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
    width: 100%;
  }
  
  .text {
    font-size: 16px;
    line-height: 1.5;
  }
}

/* Ensure clickable elements have proper spacing */
.nav-item {
  padding: 12px 16px;
  margin-bottom: 8px;
}`,
        testingSteps: [
          'Test on multiple mobile devices and screen sizes',
          'Use Chrome DevTools mobile simulation',
          'Check Google PageSpeed Insights mobile score',
          'Run Google Mobile-Friendly Test',
          'Test touch interactions and scrolling',
          'Verify text readability without zooming'
        ],
        expectedOutcome: 'Mobile usability score improves, pages become mobile-friendly, better mobile search ranking',
        priority: 'high',
        estimatedTime: '2-4 hours'
      },

      core_web_vitals_poor: {
        issueTitle: 'Optimize Core Web Vitals',
        problemDescription: 'Poor Core Web Vitals scores (LCP, FID, CLS) negatively impact user experience and search rankings.',
        technicalDetails: `Core Web Vitals metrics:
- LCP (Largest Contentful Paint): Should be < 2.5s
- FID (First Input Delay): Should be < 100ms  
- CLS (Cumulative Layout Shift): Should be < 0.1`,
        fixInstructions: [
          'Optimize images: compress, resize, use WebP format, add dimensions',
          'Implement lazy loading for images below the fold',
          'Minimize and defer non-critical JavaScript',
          'Use CSS containment to prevent layout shifts',
          'Preload critical resources (fonts, hero images)',
          'Optimize server response times and use CDN',
          'Remove render-blocking CSS and inline critical CSS'
        ],
        codeExamples: `<!-- Preload critical resources -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/images/hero.webp" as="image">

<!-- Optimize images -->
<img src="hero.webp" alt="Hero image" width="800" height="400" loading="eager">
<img src="content.webp" alt="Content" width="400" height="300" loading="lazy">

<!-- Defer non-critical JavaScript -->
<script src="analytics.js" defer></script>

/* CSS for layout stability */
.image-container {
  aspect-ratio: 16/9;
  contain: layout;
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}`,
        testingSteps: [
          'Run Google PageSpeed Insights',
          'Use Chrome DevTools Lighthouse audit',
          'Test with slow 3G connection simulation',
          'Monitor Core Web Vitals in Google Search Console',
          'Use Web Vitals Chrome extension',
          'Test on real mobile devices'
        ],
        expectedOutcome: 'Core Web Vitals scores improve to green, better user experience, improved search rankings',
        priority: 'high',
        estimatedTime: '4-8 hours'
      },

      performance_slow_loading: {
        issueTitle: 'Optimize Page Loading Performance',
        problemDescription: 'Slow page loading times hurt user experience and search rankings.',
        technicalDetails: `Performance bottlenecks include:
- Large unoptimized images
- Render-blocking resources
- Excessive HTTP requests  
- Unminified CSS/JS
- No caching headers`,
        fixInstructions: [
          'Optimize and compress images (WebP, proper sizing)',
          'Minify and bundle CSS/JavaScript files',
          'Enable browser caching with proper cache headers',
          'Use a Content Delivery Network (CDN)',
          'Implement resource preloading for critical assets',
          'Remove unused CSS and JavaScript',
          'Enable gzip compression on server'
        ],
        codeExamples: `<!-- Resource hints -->
<link rel="dns-prefetch" href="//fonts.googleapis.com">
<link rel="preconnect" href="//cdn.example.com">
<link rel="modulepreload" href="/js/main.js">

<!-- Optimized image loading -->
<picture>
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="Hero" width="800" height="400" loading="eager">
</picture>

<!-- Inline critical CSS, defer non-critical -->
<style>
  /* Critical above-the-fold CSS here */
</style>
<link rel="preload" href="/css/non-critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'">

/* Server configuration (nginx example) */
location ~* \\.(js|css|png|jpg|jpeg|gif|webp|svg|woff|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

gzip on;
gzip_types text/css application/javascript image/svg+xml;`,
        testingSteps: [
          'Run WebPageTest.org speed test',
          'Use Chrome DevTools Network tab to analyze requests',
          'Test First Contentful Paint and Time to Interactive',
          'Check image optimization and format usage',
          'Verify caching headers are set correctly',
          'Test loading speed on different connections'
        ],
        expectedOutcome: 'Faster page loading, better user engagement, improved search rankings',
        priority: 'high',
        estimatedTime: '3-6 hours'
      },

      css_render_blocking: {
        issueTitle: 'Fix Render-Blocking CSS',
        problemDescription: 'CSS files are blocking the initial page render, slowing down page display.',
        technicalDetails: 'Render-blocking CSS prevents the browser from displaying content until all CSS is downloaded and parsed.',
        fixInstructions: [
          'Identify critical above-the-fold CSS',
          'Inline critical CSS in HTML head',
          'Load non-critical CSS asynchronously',
          'Use media queries to conditionally load CSS',
          'Remove unused CSS rules',
          'Combine multiple CSS files to reduce requests'
        ],
        codeExamples: `<!-- Inline critical CSS -->
<style>
/* Critical above-the-fold styles */
body { margin: 0; font-family: system-ui; }
.header { background: #fff; padding: 1rem; }
.hero { height: 60vh; background: #f5f5f5; }
</style>

<!-- Async load non-critical CSS -->
<link rel="preload" href="/css/below-fold.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/css/below-fold.css"></noscript>

<!-- Conditional CSS loading -->
<link rel="stylesheet" href="/css/print.css" media="print">
<link rel="stylesheet" href="/css/mobile.css" media="(max-width: 768px)">`,
        testingSteps: [
          'Run Lighthouse audit and check "Eliminate render-blocking resources"',
          'Use Chrome DevTools Coverage tab to find unused CSS',
          'Test page rendering with CSS disabled',
          'Verify above-the-fold content displays quickly',
          'Check that async CSS loads without blocking'
        ],
        expectedOutcome: 'Faster initial page render, improved First Contentful Paint score',
        priority: 'medium',
        estimatedTime: '2-4 hours'
      },

      javascript_render_blocking: {
        issueTitle: 'Fix Render-Blocking JavaScript',
        problemDescription: 'JavaScript files are blocking page rendering and slowing down initial content display.',
        technicalDetails: 'Synchronous JavaScript in the document head prevents HTML parsing and rendering.',
        fixInstructions: [
          'Move non-critical JavaScript to bottom of body',
          'Add async or defer attributes to script tags',
          'Inline critical JavaScript only',
          'Use dynamic imports for code splitting',
          'Remove unused JavaScript code',
          'Bundle and minify JavaScript files'
        ],
        codeExamples: `<!-- Defer non-critical scripts -->
<script src="/js/analytics.js" defer></script>
<script src="/js/non-critical.js" async></script>

<!-- Dynamic imports for code splitting -->
<script>
// Load feature only when needed
async function loadFeature() {
  const { feature } = await import('/js/feature.js');
  feature.init();
}

// Intersection Observer for lazy loading
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadFeature();
      observer.unobserve(entry.target);
    }
  });
});
</script>

<!-- Critical inline JavaScript only -->
<script>
// Essential JavaScript only
document.documentElement.className = 'js';
</script>`,
        testingSteps: [
          'Run Lighthouse audit for "Remove unused JavaScript"',
          'Use Chrome DevTools Coverage to find unused JS',
          'Test page functionality with JS disabled/delayed',
          'Verify async/defer scripts don\'t block rendering',
          'Check bundle sizes and loading order'
        ],
        expectedOutcome: 'Faster page rendering, improved Time to Interactive, better user experience',
        priority: 'medium', 
        estimatedTime: '2-3 hours'
      }
    };

    return instructionsMap[issueType] || null;
  }

  static generateCopyableInstructions(instructions: CodingAgentInstructions): string {
    return `# ${instructions.issueTitle}

## Problem Description
${instructions.problemDescription}

## Technical Details
${instructions.technicalDetails}

## Fix Instructions
${instructions.fixInstructions.map((step, index) => `${index + 1}. ${step}`).join('\n')}

## Code Examples
\`\`\`
${instructions.codeExamples}
\`\`\`

## Testing Steps
${instructions.testingSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

## Expected Outcome
${instructions.expectedOutcome}

**Priority:** ${instructions.priority.toUpperCase()}
**Estimated Time:** ${instructions.estimatedTime}

---
Generated by SEOAgent.com - Automated SEO Assistant`;
  }
}