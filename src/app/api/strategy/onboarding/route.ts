/**
 * GET /api/strategy/onboarding?websiteToken=xxx
 *
 * Checks if a website needs strategy onboarding and returns pre-filled data
 *
 * Response:
 * {
 *   needsOnboarding: boolean
 *   websiteData: {
 *     domain: string
 *     brand?: string
 *     geoFocus?: string[]
 *     existingUrls?: string[] // From sitemap or website crawl
 *   }
 *   suggestions: {
 *     seedTopics?: string[] // AI-generated topic suggestions
 *     seedUrls?: string[] // Suggested URLs to scrape
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStrategyStatus } from '@/services/strategy/discovery-persistence';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const websiteToken = searchParams.get('websiteToken');

    if (!websiteToken) {
      return NextResponse.json(
        { error: 'Missing websiteToken parameter' },
        { status: 400 }
      );
    }

    // Check strategy status
    const status = await getStrategyStatus(websiteToken);
    const needsOnboarding = !status || !status.strategy_initialized;

    // Fetch website data
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('domain, website_token')
      .eq('website_token', websiteToken)
      .single();

    if (websiteError || !website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    // Get existing content URLs from sitemap or crawl
    const { data: sitemapEntries } = await supabase
      .from('sitemap_urls')
      .select('url')
      .eq('website_token', websiteToken)
      .limit(10);

    const existingUrls = sitemapEntries?.map(entry => entry.url) || [];

    // Extract brand from domain (basic heuristic)
    const domainParts = website.domain.replace(/^www\./, '').split('.');
    const brand = domainParts[0]
      .split('-')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Suggest seed URLs (homepage + common pages)
    const suggestedSeedUrls = [
      `https://${website.domain}`,
      `https://${website.domain}/about`,
      `https://${website.domain}/blog`,
      `https://${website.domain}/products`,
      `https://${website.domain}/services`
    ];

    // Get existing keywords for topic suggestions
    const { data: keywords } = await supabase
      .from('website_keywords')
      .select('keyword')
      .eq('website_token', websiteToken)
      .order('search_volume', { ascending: false })
      .limit(10);

    const seedTopics = keywords?.map(k => k.keyword) || [];

    return NextResponse.json({
      needsOnboarding,
      websiteData: {
        domain: website.domain,
        brand,
        geoFocus: ['United States'], // Default, can be customized
        existingUrls
      },
      suggestions: {
        seedTopics: seedTopics.length > 0 ? seedTopics : undefined,
        seedUrls: suggestedSeedUrls
      }
    });

  } catch (error) {
    console.error('[STRATEGY ONBOARDING API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch onboarding data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
