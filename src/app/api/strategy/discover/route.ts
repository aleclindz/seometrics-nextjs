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
  userToken: z.string().min(1), // Added for brief generation
  brand: z.string().min(1),
  domain: z.string().min(1),
  geoFocus: z.array(z.string()),
  seedTopics: z.array(z.string()),
  seedUrls: z.array(z.string()).optional(),
  rawOwnerContext: z.string().optional(),
  discoveryType: z.enum(['initial', 'refresh', 'manual']).default('initial'),
  conversationId: z.string().optional(), // For callback to send follow-up message
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
      userToken,
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

    // Save to database (includes auto-brief generation)
    const saveResult = await saveDiscoveryToDatabase({
      websiteToken,
      userToken,
      discoveryType,
      input,
      result
    });

    console.log('[DISCOVERY API] Discovery completed', {
      discoveryId: saveResult.discoveryId,
      clusters: Object.keys(saveResult.clusterIds).length,
      articles: Object.keys(saveResult.articleRoleIds).length,
      briefsGenerated: saveResult.briefsGenerated || 0
    });

    console.log('[DISCOVERY API] saveResult received:', {
      briefsGenerated: saveResult.briefsGenerated,
      pillarBriefs: saveResult.pillarBriefs,
      supportingBriefs: saveResult.supportingBriefs,
      hasClusterIds: !!saveResult.clusterIds,
      hasArticleRoleIds: !!saveResult.articleRoleIds
    });

    const responsePayload = {
      success: true,
      discoveryId: saveResult.discoveryId,
      summary: {
        clusters: Object.keys(saveResult.clusterIds).length,
        articles: Object.keys(saveResult.articleRoleIds).length,
        pillars: result.output.articles.filter(a => a.role === 'PILLAR').length,
        supporting: result.output.articles.filter(a => a.role === 'SUPPORTING').length,
        briefsGenerated: saveResult.briefsGenerated || 0,
        pillarBriefs: saveResult.pillarBriefs || 0,
        supportingBriefs: saveResult.supportingBriefs || 0
      },
      output: result.output
    };

    console.log('[DISCOVERY API] Sending response with brief counts:', {
      briefsGenerated: responsePayload.summary.briefsGenerated,
      pillarBriefs: responsePayload.summary.pillarBriefs,
      supportingBriefs: responsePayload.summary.supportingBriefs
    });

    // Trigger callback to send follow-up message to chat (fire-and-forget)
    // This allows the agent to send a follow-up message with correct brief counts
    // after the async brief generation completes
    const conversationId = body.conversationId; // Passed from agent
    if (conversationId) {
      console.log('[DISCOVERY API] Triggering callback for conversation:', conversationId);

      // Defensive: Query database directly for actual brief counts if saveResult returned 0
      let finalBriefsGenerated = responsePayload.summary.briefsGenerated;
      let finalPillarBriefs = responsePayload.summary.pillarBriefs;
      let finalSupportingBriefs = responsePayload.summary.supportingBriefs;

      if (finalBriefsGenerated === 0) {
        console.log('[DISCOVERY API] saveResult returned 0 briefs, querying database directly...');
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          // Count briefs created from this discovery
          const { data: briefCounts } = await supabase
            .from('article_briefs')
            .select('article_role')
            .eq('website_token', websiteToken)
            .eq('discovery_id', saveResult.discoveryId);

          if (briefCounts && briefCounts.length > 0) {
            finalBriefsGenerated = briefCounts.length;
            finalPillarBriefs = briefCounts.filter((b: any) => b.article_role === 'PILLAR').length;
            finalSupportingBriefs = briefCounts.filter((b: any) => b.article_role === 'SUPPORTING').length;

            console.log('[DISCOVERY API] Defensive query found actual counts:', {
              briefsGenerated: finalBriefsGenerated,
              pillarBriefs: finalPillarBriefs,
              supportingBriefs: finalSupportingBriefs
            });
          }
        } catch (queryError) {
          console.error('[DISCOVERY API] Defensive query failed:', queryError);
        }
      }

      // Fire-and-forget callback (don't await)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agent/callback/discovery-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          websiteToken,
          conversationId,
          discoveryId: saveResult.discoveryId,
          summary: {
            clusters: responsePayload.summary.clusters,
            briefsGenerated: finalBriefsGenerated,
            pillarBriefs: finalPillarBriefs,
            supportingBriefs: finalSupportingBriefs
          }
        })
      }).catch(err => {
        console.error('[DISCOVERY API] Callback failed (non-blocking):', err);
      });
    } else {
      console.log('[DISCOVERY API] No conversationId provided, skipping callback');
    }

    return NextResponse.json(responsePayload);

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
