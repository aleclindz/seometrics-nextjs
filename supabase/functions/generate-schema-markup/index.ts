import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[GENERATE-SCHEMA-MARKUP] Starting schema markup generation');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { id: websiteToken, pageData, existingSchemaCount } = await req.json()
    
    if (!websiteToken || !pageData) {
      console.error('[GENERATE-SCHEMA-MARKUP] Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing websiteToken or pageData' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[GENERATE-SCHEMA-MARKUP] Processing schema for:', pageData.url);
    console.log('[GENERATE-SCHEMA-MARKUP] Existing schema count:', existingSchemaCount);

    // Check if schema markup is needed based on page analysis
    const schemas: any[] = [];

    // 1. Basic WebPage/WebSite schema (always add if none exists)
    if (existingSchemaCount === 0) {
      const baseSchema = {
        "@context": "https://schema.org",
        "@type": pageData.url === pageData.url.match(/^https?:\/\/[^\/]+\/?$/)?.[0] ? "WebSite" : "WebPage",
        "url": pageData.url,
        "name": pageData.title,
        "description": pageData.description || pageData.title
      };

      if (pageData.url === pageData.url.match(/^https?:\/\/[^\/]+\/?$/)?.[0]) {
        // This is homepage - add WebSite schema
        baseSchema["@type"] = "WebSite";
        baseSchema["potentialAction"] = {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": pageData.url.replace(/\/$/, '') + "/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        };
      }

      schemas.push(baseSchema);
    }

    // 2. Organization schema (if contact info detected)
    if (pageData.hasContactInfo && existingSchemaCount === 0) {
      const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "url": pageData.url.match(/^https?:\/\/[^\/]+/)?.[0] || pageData.url,
        "name": extractDomainName(pageData.url)
      };

      if (pageData.images && pageData.images.length > 0) {
        organizationSchema["logo"] = pageData.images[0];
      }

      schemas.push(organizationSchema);
    }

    // 3. Article schema (if article content detected)
    if (pageData.hasArticleContent && !pageData.url.match(/^https?:\/\/[^\/]+\/?$/)) {
      const articleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": pageData.title,
        "description": pageData.description || pageData.title,
        "url": pageData.url,
        "datePublished": new Date().toISOString(),
        "dateModified": new Date().toISOString(),
        "author": {
          "@type": "Organization",
          "name": extractDomainName(pageData.url)
        }
      };

      if (pageData.images && pageData.images.length > 0) {
        articleSchema["image"] = pageData.images[0];
      }

      schemas.push(articleSchema);
    }

    // 4. BreadcrumbList schema (if breadcrumbs detected or can be inferred)
    if (pageData.hasBreadcrumbs || shouldAddBreadcrumbs(pageData.url)) {
      const breadcrumbSchema = generateBreadcrumbSchema(pageData.url);
      if (breadcrumbSchema) {
        schemas.push(breadcrumbSchema);
      }
    }

    // 5. FAQ schema (if FAQ content patterns detected)
    if (detectFAQContent(pageData.headings)) {
      const faqSchema = generateFAQSchema(pageData.headings);
      if (faqSchema) {
        schemas.push(faqSchema);
      }
    }

    // Store schema generation record
    try {
      await supabase
        .from('schema_generations')
        .insert({
          website_token: websiteToken,
          page_url: pageData.url,
          schemas_generated: schemas.length,
          schema_types: schemas.map(s => s['@type']),
          generated_at: new Date().toISOString()
        })
    } catch (dbError) {
      console.error('[GENERATE-SCHEMA-MARKUP] Database error:', dbError);
      // Don't fail the request if logging fails
    }

    console.log(`[GENERATE-SCHEMA-MARKUP] Generated ${schemas.length} schema blocks for ${pageData.url}`);

    return new Response(
      JSON.stringify({
        success: true,
        schemas: schemas,
        generated: schemas.length,
        pageUrl: pageData.url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[GENERATE-SCHEMA-MARKUP] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate schema markup',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '').split('.')[0];
  } catch {
    return 'Website';
  }
}

function shouldAddBreadcrumbs(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
    return pathSegments.length > 1; // More than just domain
  } catch {
    return false;
  }
}

function generateBreadcrumbSchema(url: string): any | null {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
    
    if (pathSegments.length === 0) return null;

    const breadcrumbs = [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${urlObj.protocol}//${urlObj.host}`
      }
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += '/' + segment;
      breadcrumbs.push({
        "@type": "ListItem",
        "position": index + 2,
        "name": segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        "item": `${urlObj.protocol}//${urlObj.host}${currentPath}`
      });
    });

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs
    };
  } catch {
    return null;
  }
}

function detectFAQContent(headings: string[]): boolean {
  if (!headings || headings.length < 2) return false;
  
  const faqIndicators = [
    /frequently asked questions?/i,
    /^what\s+/i,
    /^how\s+/i,
    /^why\s+/i,
    /^when\s+/i,
    /^where\s+/i,
    /\?$/
  ];

  const questionHeadings = headings.filter(heading => 
    faqIndicators.some(pattern => pattern.test(heading))
  );

  return questionHeadings.length >= 2;
}

function generateFAQSchema(headings: string[]): any | null {
  const questionHeadings = headings.filter(heading => 
    /^(what|how|why|when|where)\s+|frequently asked|\?$/i.test(heading)
  );

  if (questionHeadings.length < 2) return null;

  const mainEntity = questionHeadings.slice(0, 5).map(question => ({
    "@type": "Question",
    "name": question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "This question is answered on the page."
    }
  }));

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": mainEntity
  };
}