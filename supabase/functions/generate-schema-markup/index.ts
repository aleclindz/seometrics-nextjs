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

    // 2. Local Business or Organization schema (enhanced with business detection)
    if (pageData.hasContactInfo && existingSchemaCount === 0) {
      const businessSchema = await generateBusinessSchema(websiteToken, pageData);
      if (businessSchema) {
        schemas.push(businessSchema);
      }
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

async function generateBusinessSchema(websiteToken: string, pageData: any): Promise<any | null> {
  try {
    // Get business information from database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: website, error } = await supabaseClient
      .from('websites')
      .select('business_type, business_info, business_detection_confidence, domain')
      .eq('website_token', websiteToken)
      .single();

    if (error || !website) {
      console.log('[SCHEMA GENERATION] No website data found, using basic Organization schema');
      return generateBasicOrganizationSchema(pageData);
    }

    const businessInfo = website.business_info || {};
    const businessType = website.business_type || 'unknown';

    // If not a local business or low confidence, use basic Organization schema
    if (businessType === 'online' || businessType === 'unknown' || website.business_detection_confidence < 30) {
      return generateBasicOrganizationSchema(pageData);
    }

    // Get appropriate schema type based on business category
    const schemaType = await getBusinessSchemaType(businessInfo.businessCategory);

    // Generate LocalBusiness or specific business type schema
    const localBusinessSchema: any = {
      "@context": "https://schema.org",
      "@type": schemaType,
      "url": pageData.url.match(/^https?:\/\/[^\/]+/)?.[0] || pageData.url,
      "name": businessInfo.name || extractDomainName(pageData.url)
    };

    // Add address if available
    if (businessInfo.address) {
      localBusinessSchema.address = {
        "@type": "PostalAddress",
        "streetAddress": businessInfo.address,
        ...(businessInfo.city && { "addressLocality": businessInfo.city }),
        ...(businessInfo.state && { "addressRegion": businessInfo.state }),
        ...(businessInfo.zipCode && { "postalCode": businessInfo.zipCode }),
        ...(businessInfo.country && { "addressCountry": businessInfo.country })
      };
    }

    // Add phone number
    if (businessInfo.phone) {
      localBusinessSchema.telephone = businessInfo.phone;
    }

    // Add business hours
    if (businessInfo.hours) {
      localBusinessSchema.openingHours = parseBusinessHours(businessInfo.hours);
    }

    // Add service area for service businesses
    if (businessType === 'hybrid' || businessType === 'service') {
      if (businessInfo.serviceArea) {
        localBusinessSchema.areaServed = businessInfo.serviceArea;
      }
    }

    // Add coordinates if available
    if (businessInfo.coordinates) {
      localBusinessSchema.geo = {
        "@type": "GeoCoordinates",
        "latitude": businessInfo.coordinates.latitude,
        "longitude": businessInfo.coordinates.longitude
      };
    }

    // Add description
    if (pageData.description) {
      localBusinessSchema.description = pageData.description;
    }

    // Add logo/image
    if (pageData.images && pageData.images.length > 0) {
      localBusinessSchema.logo = pageData.images[0];
      localBusinessSchema.image = pageData.images[0];
    }

    // Add price range for appropriate business types
    if (['restaurant', 'retail', 'service'].includes(businessInfo.businessCategory)) {
      localBusinessSchema.priceRange = businessInfo.priceRange || '$$';
    }

    // Add specific properties based on business category
    addCategorySpecificProperties(localBusinessSchema, businessInfo.businessCategory, businessInfo);

    console.log(`[SCHEMA GENERATION] Generated ${schemaType} schema for ${website.domain}`);
    return localBusinessSchema;

  } catch (error) {
    console.error('[SCHEMA GENERATION] Error generating business schema:', error);
    return generateBasicOrganizationSchema(pageData);
  }
}

function generateBasicOrganizationSchema(pageData: any): any {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "url": pageData.url.match(/^https?:\/\/[^\/]+/)?.[0] || pageData.url,
    "name": extractDomainName(pageData.url)
  };

  if (pageData.images && pageData.images.length > 0) {
    organizationSchema.logo = pageData.images[0];
  }

  if (pageData.description) {
    organizationSchema.description = pageData.description;
  }

  return organizationSchema;
}

async function getBusinessSchemaType(businessCategory?: string): Promise<string> {
  if (!businessCategory) return 'LocalBusiness';

  // Map categories to specific schema types
  const categoryMap: Record<string, string> = {
    'restaurant': 'Restaurant',
    'service': 'ProfessionalService',
    'emergency_service': 'EmergencyService',
    'retail': 'Store',
    'medical': 'MedicalOrganization',
    'automotive': 'AutomotiveBusiness',
    'local': 'LocalBusiness'
  };

  return categoryMap[businessCategory] || 'LocalBusiness';
}

function parseBusinessHours(hoursString: string): string[] {
  // Simple parsing - could be enhanced for more complex formats
  const hours: string[] = [];
  
  // Common patterns like "Mon-Fri 9am-5pm"
  if (/mon.*fri|monday.*friday/i.test(hoursString)) {
    const days = ['Mo', 'Tu', 'We', 'Th', 'Fr'];
    const timeMatch = hoursString.match(/(\d{1,2}(?::\d{2})?(?:am|pm)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?(?:am|pm)?)/i);
    
    if (timeMatch) {
      const openTime = normalizeTime(timeMatch[1]);
      const closeTime = normalizeTime(timeMatch[2]);
      
      days.forEach(day => {
        hours.push(`${day} ${openTime}-${closeTime}`);
      });
    }
  }
  
  // If no structured format detected, return as-is
  if (hours.length === 0) {
    hours.push(hoursString);
  }
  
  return hours;
}

function normalizeTime(timeStr: string): string {
  // Convert time to 24-hour format for schema.org
  const time = timeStr.toLowerCase().trim();
  
  if (time.includes('pm') && !time.startsWith('12')) {
    const hour = parseInt(time.match(/\d+/)?.[0] || '0');
    return time.replace(/\d+/, String(hour + 12)).replace('pm', '');
  }
  
  if (time.includes('am')) {
    if (time.startsWith('12')) {
      return time.replace('12', '00').replace('am', '');
    }
    return time.replace('am', '');
  }
  
  return time;
}

function addCategorySpecificProperties(schema: any, category?: string, businessInfo?: any) {
  if (!category) return;

  switch (category) {
    case 'restaurant':
      if (businessInfo?.cuisine) {
        schema.servesCuisine = businessInfo.cuisine;
      }
      if (businessInfo?.acceptsReservations !== undefined) {
        schema.acceptsReservations = businessInfo.acceptsReservations;
      }
      if (businessInfo?.menu) {
        schema.hasMenu = businessInfo.menu;
      }
      break;

    case 'medical':
      if (businessInfo?.specialty) {
        schema.medicalSpecialty = businessInfo.specialty;
      }
      if (businessInfo?.insurance) {
        schema.acceptedInsurance = businessInfo.insurance;
      }
      break;

    case 'automotive':
      if (businessInfo?.brands) {
        schema.brand = businessInfo.brands;
      }
      if (businessInfo?.services) {
        schema.availableService = businessInfo.services;
      }
      break;

    case 'service':
      if (businessInfo?.serviceType) {
        schema.serviceType = businessInfo.serviceType;
      }
      break;
  }

  // Add payment methods if available
  if (businessInfo?.paymentMethods) {
    schema.paymentAccepted = businessInfo.paymentMethods;
  }

  // Add social media profiles
  if (businessInfo?.socialProfiles) {
    schema.sameAs = businessInfo.socialProfiles;
  }
}