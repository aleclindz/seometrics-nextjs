/**
 * POST /api/strategy/discover
 *
 * Runs Master Discovery for a website and saves results to database
 *
 * Body:
 * {
 *   websiteToken: string
 *   brand: string
 *   domain: string
 *   geoFocus: string[]
 *   seedTopics: string[]
 *   seedUrls?: string[]
 *   rawOwnerContext?: string
 *   discoveryType?: 'initial' | 'refresh' | 'manual'
 *   controls?: {
 *     maxClusters?: number
 *     minClusters?: number
 *     mapSections?: boolean
 *     includeLocalSlices?: boolean
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { runMasterDiscovery, MasterDiscoveryInput } from '@/services/strategy/master-discovery';
import { saveDiscoveryToDatabase } from '@/services/strategy/discovery-persistence';
import { z } from 'zod';

const DiscoverRequestSchema = z.object({
  websiteToken: z.string().min(1),
  brand: z.string().min(1),
  domain: z.string().min(1),
  geoFocus: z.array(z.string()),
  seedTopics: z.array(z.string()),
  seedUrls: z.array(z.string()).optional(),
  rawOwnerContext: z.string().optional(),
  discoveryType: z.enum(['initial', 'refresh', 'manual']).default('initial'),
  controls: z.object({
    maxClusters: z.number().optional(),
    minClusters: z.number().optional(),
    mapSections: z.boolean().optional(),
    includeLocalSlices: z.boolean().optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = DiscoverRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      websiteToken,
      brand,
      domain,
      geoFocus,
      seedTopics,
      seedUrls,
      rawOwnerContext,
      discoveryType,
      controls
    } = validation.data;

    console.log('[DISCOVERY API] Starting discovery for', domain);

    // Build input
    const input: MasterDiscoveryInput = {
      site: {
        brand,
        domain,
        geo_focus: geoFocus,
        seed_topics: seedTopics
      },
      sources: {
        seed_urls: seedUrls,
        raw_owner_context: rawOwnerContext
      },
      controls: controls ? {
        max_clusters: controls.maxClusters,
        min_clusters: controls.minClusters,
        map_sections: controls.mapSections,
        include_local_slices: controls.includeLocalSlices
      } : undefined
    };

    // Run discovery
    const result = await runMasterDiscovery(input);

    // Save to database
    const saveResult = await saveDiscoveryToDatabase({
      websiteToken,
      discoveryType,
      input,
      result
    });

    console.log('[DISCOVERY API] Discovery completed', {
      discoveryId: saveResult.discoveryId,
      clusters: Object.keys(saveResult.clusterIds).length,
      articles: Object.keys(saveResult.articleRoleIds).length
    });

    return NextResponse.json({
      success: true,
      discoveryId: saveResult.discoveryId,
      summary: {
        clusters: Object.keys(saveResult.clusterIds).length,
        articles: Object.keys(saveResult.articleRoleIds).length,
        pillars: result.output.articles.filter(a => a.role === 'PILLAR').length,
        supporting: result.output.articles.filter(a => a.role === 'SUPPORTING').length
      },
      output: result.output
    });

  } catch (error) {
    console.error('[DISCOVERY API] Error:', error);
    return NextResponse.json(
      {
        error: 'Discovery failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
