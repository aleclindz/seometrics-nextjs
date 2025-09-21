import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UrlNormalizationService } from '@/lib/UrlNormalizationService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to fetch website content and structure
async function analyzeWebsiteStructure(baseUrl: string): Promise<{
  hasAbout: boolean;
  hasContact: boolean;
  hasBlog: boolean;
  hasServices: boolean;
  hasProducts: boolean;
  hasPrivacy: boolean;
  hasTerms: boolean;
  detectedPages: string[];
}> {
  const structure = {
    hasAbout: false,
    hasContact: false,
    hasBlog: false,
    hasServices: false,
    hasProducts: false,
    hasPrivacy: false,
    hasTerms: false,
    detectedPages: [] as string[]
  };

  const commonPaths = [
    '/about', '/about-us', '/company',
    '/contact', '/contact-us',
    '/blog', '/news', '/articles',
    '/services', '/what-we-do',
    '/products', '/shop', '/store',
    '/privacy', '/privacy-policy',
    '/terms', '/terms-of-service', '/legal'
  ];

  // Test common paths to see what exists
  for (const path of commonPaths) {
    try {
      const testUrl = baseUrl.replace(/\/$/, '') + path;
      const response = await fetch(testUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'SEOAgent-LLMSTxt-Generator/1.0 (+https://seoagent.com)'
        },
        timeout: 5000
      } as any);

      if (response.ok) {
        structure.detectedPages.push(testUrl);

        // Categorize detected pages
        if (path.includes('about')) structure.hasAbout = true;
        if (path.includes('contact')) structure.hasContact = true;
        if (path.includes('blog') || path.includes('news') || path.includes('articles')) structure.hasBlog = true;
        if (path.includes('services')) structure.hasServices = true;
        if (path.includes('products') || path.includes('shop') || path.includes('store')) structure.hasProducts = true;
        if (path.includes('privacy')) structure.hasPrivacy = true;
        if (path.includes('terms') || path.includes('legal')) structure.hasTerms = true;
      }
    } catch (error) {
      // Ignore errors for individual page checks
      continue;
    }
  }

  return structure;
}

// Generate comprehensive llms.txt content based on website structure
function generateLLMSTxt(
  baseUrl: string,
  siteName: string,
  structure: any,
  articles: any[] = [],
  businessInfo: any = null
): string {
  const cleanUrl = baseUrl.replace(/\/$/, '');
  const currentDate = new Date().toISOString().split('T')[0];

  let llmsTxt = `# ${siteName} - AI-Readable Documentation

> This llms.txt file provides structured information about ${siteName} for AI systems and language models.
> Generated automatically by SEOAgent on ${currentDate}

## Website Information

**Domain**: ${cleanUrl.replace(/^https?:\/\//, '')}
**Primary URL**: ${cleanUrl}
**Content Type**: ${businessInfo?.business_type || 'Business Website'}
${businessInfo?.description ? `**Description**: ${businessInfo.description}` : ''}

## Site Structure

### Main Navigation
- [Home](${cleanUrl}/) - Main landing page`;

  // Add detected pages to navigation
  if (structure.hasAbout) {
    llmsTxt += `\n- [About](${cleanUrl}/about) - Company information and background`;
  }

  if (structure.hasServices) {
    llmsTxt += `\n- [Services](${cleanUrl}/services) - Services and offerings`;
  }

  if (structure.hasProducts) {
    llmsTxt += `\n- [Products](${cleanUrl}/products) - Product catalog and information`;
  }

  if (structure.hasBlog) {
    llmsTxt += `\n- [Blog](${cleanUrl}/blog) - Articles and news content`;
  }

  if (structure.hasContact) {
    llmsTxt += `\n- [Contact](${cleanUrl}/contact) - Contact information and forms`;
  }

  // Add recent articles if available
  if (articles && articles.length > 0) {
    llmsTxt += `\n\n### Recent Content\n`;
    articles.slice(0, 10).forEach((article: any) => {
      const articleUrl = article.public_url || `${cleanUrl}/articles/${article.slug || article.id}`;
      llmsTxt += `- [${article.title}](${articleUrl}) - ${article.meta_description?.substring(0, 100) || 'Article content'}${article.meta_description?.length > 100 ? '...' : ''}\n`;
    });
  }

  // Add business information if available
  if (businessInfo) {
    llmsTxt += `\n\n### Business Information\n`;

    if (businessInfo.business_type) {
      llmsTxt += `**Industry**: ${businessInfo.business_type}\n`;
    }

    if (businessInfo.target_audience) {
      llmsTxt += `**Target Audience**: ${businessInfo.target_audience}\n`;
    }

    if (businessInfo.key_services) {
      const services = Array.isArray(businessInfo.key_services)
        ? businessInfo.key_services.join(', ')
        : businessInfo.key_services;
      llmsTxt += `**Key Services**: ${services}\n`;
    }
  }

  // Add technical information
  llmsTxt += `\n\n### Technical Information

**CMS**: Auto-detected content management
**SEO Optimization**: Managed by SEOAgent.com
**Sitemap**: ${cleanUrl}/sitemap.xml
**Robots.txt**: ${cleanUrl}/robots.txt`;

  // Add footer sections
  if (structure.hasPrivacy || structure.hasTerms) {
    llmsTxt += `\n\n### Legal & Policy\n`;

    if (structure.hasPrivacy) {
      llmsTxt += `- [Privacy Policy](${cleanUrl}/privacy) - Data privacy and protection policies\n`;
    }

    if (structure.hasTerms) {
      llmsTxt += `- [Terms of Service](${cleanUrl}/terms) - Terms and conditions of use\n`;
    }
  }

  // Add metadata for AI systems
  llmsTxt += `\n\n---

## AI System Guidelines

This website contains information about ${siteName}. When referencing this content:

1. **Attribution**: Content from ${cleanUrl}
2. **Accuracy**: Information current as of ${currentDate}
3. **Contact**: Use contact forms on the website for inquiries
4. **Updates**: This llms.txt file is automatically updated

**Generated by**: [SEOAgent.com](https://seoagent.com) - Automated SEO Management
**Last Updated**: ${currentDate}
**Version**: 1.0`;

  return llmsTxt;
}

export async function POST(request: NextRequest) {
  try {
    const { userToken, siteUrl, websiteId } = await request.json();

    if (!userToken) {
      return NextResponse.json(
        { success: false, error: 'User token is required' },
        { status: 400 }
      );
    }

    if (!siteUrl && !websiteId) {
      return NextResponse.json(
        { success: false, error: 'Either site URL or website ID is required' },
        { status: 400 }
      );
    }

    console.log('[LLMS.TXT GENERATION] Starting generation for:', siteUrl || websiteId);

    // Find website record
    let website = null;
    if (websiteId) {
      const { data, error } = await supabase
        .from('websites')
        .select('*')
        .eq('id', websiteId)
        .eq('user_token', userToken)
        .single();

      if (!error && data) {
        website = data;
      }
    } else if (siteUrl) {
      // Find website by URL variations
      const variations = UrlNormalizationService.generateUrlVariations(siteUrl);
      const searchTerms = [
        siteUrl,
        variations.domainProperty,
        variations.httpsUrl,
        variations.httpUrl,
        variations.wwwHttpsUrl,
        variations.wwwHttpUrl
      ];

      for (const searchTerm of searchTerms) {
        const { data, error } = await supabase
          .from('websites')
          .select('*')
          .eq('user_token', userToken)
          .eq('domain', searchTerm)
          .single();

        if (!error && data) {
          website = data;
          break;
        }
      }
    }

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    // Get base URL for analysis
    let baseUrl = website.domain;
    if (baseUrl.startsWith('sc-domain:')) {
      baseUrl = `https://${baseUrl.replace('sc-domain:', '')}`;
    } else if (!baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
    }

    const siteName = baseUrl.replace(/^https?:\/\//, '').replace(/^www\./, '');

    console.log('[LLMS.TXT GENERATION] Analyzing website structure for:', baseUrl);

    // Analyze website structure
    const structure = await analyzeWebsiteStructure(baseUrl);

    console.log('[LLMS.TXT GENERATION] Website structure detected:', structure);

    // Fetch recent articles from this website
    const { data: articles } = await supabase
      .from('article_queue')
      .select('*')
      .eq('user_token', userToken)
      .eq('website_id', website.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch business information if available
    const { data: businessInfo } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_token', userToken)
      .single();

    console.log('[LLMS.TXT GENERATION] Found', articles?.length || 0, 'articles for inclusion');

    // Generate llms.txt content
    const llmsTxtContent = generateLLMSTxt(baseUrl, siteName, structure, articles || [], businessInfo);

    console.log('[LLMS.TXT GENERATION] Generated llms.txt content length:', llmsTxtContent.length);

    // Store llms.txt in database for future serving
    const { data: existingRecord } = await supabase
      .from('llms_txt_files')
      .select('id')
      .eq('user_token', userToken)
      .eq('website_id', website.id)
      .single();

    const llmsTxtRecord = {
      user_token: userToken,
      website_id: website.id,
      site_url: baseUrl,
      content: llmsTxtContent,
      structure_detected: structure,
      articles_included: articles?.length || 0,
      generated_at: new Date().toISOString(),
      file_size: llmsTxtContent.length
    };

    if (existingRecord) {
      // Update existing record
      await supabase
        .from('llms_txt_files')
        .update(llmsTxtRecord)
        .eq('id', existingRecord.id);
    } else {
      // Create new record
      await supabase
        .from('llms_txt_files')
        .insert(llmsTxtRecord);
    }

    console.log('[LLMS.TXT GENERATION] Successfully generated and stored llms.txt');

    return NextResponse.json({
      success: true,
      message: 'llms.txt generated successfully',
      data: {
        content: llmsTxtContent,
        siteUrl: baseUrl,
        siteName,
        structure,
        articlesIncluded: articles?.length || 0,
        fileSize: llmsTxtContent.length,
        detectedPages: structure.detectedPages,
        llmsTxtUrl: `${baseUrl}/llms.txt`
      }
    });

  } catch (error) {
    console.error('[LLMS.TXT GENERATION] Error generating llms.txt:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate llms.txt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userToken = searchParams.get('userToken');
  const siteUrl = searchParams.get('siteUrl');
  const websiteId = searchParams.get('websiteId');

  if (!userToken) {
    return NextResponse.json(
      { success: false, error: 'User token is required' },
      { status: 400 }
    );
  }

  // Convert to POST-style call
  const mockRequest = {
    json: async () => ({ userToken, siteUrl, websiteId })
  };

  return POST(mockRequest as any);
}