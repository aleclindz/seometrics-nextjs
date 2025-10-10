/**
 * Brief Generator Service
 *
 * Automatically generates article_briefs from article_roles after Master Discovery completes.
 * This bridges the gap between strategy initialization and content generation.
 *
 * Flow:
 * 1. Master Discovery creates article_roles
 * 2. This service generates article_briefs for each role
 * 3. User can then schedule briefs for generation in Content Tab
 * 4. Cron job picks up scheduled briefs and generates articles
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ArticleRole {
  id: number;
  discovery_article_id: string;
  role: 'PILLAR' | 'SUPPORTING';
  title: string;
  primary_keyword: string;
  secondary_keywords: string[];
  topic_cluster_id: number;
  cluster_name?: string; // From join with topic_clusters
  section_map?: any;
  links_to_article_ids?: string[];
}

export interface BriefGenerationResult {
  briefIds: number[];
  briefIdMap: Record<string, number>; // discovery_article_id -> brief_id
  pillarCount: number;
  supportingCount: number;
  totalGenerated: number;
}

/**
 * Generate article_briefs from article_roles
 *
 * @param websiteToken - Website identifier
 * @param userToken - User identifier
 * @param discoveryId - Strategy discovery ID
 * @param articleRoles - Array of article roles from discovery
 * @returns Brief generation results with IDs and counts
 */
export async function generateBriefsFromArticleRoles(
  websiteToken: string,
  userToken: string,
  discoveryId: number,
  articleRoles: ArticleRole[]
): Promise<BriefGenerationResult> {
  console.log('[BRIEF GENERATOR] Starting brief generation for', articleRoles.length, 'article roles');

  const briefIds: number[] = [];
  const briefIdMap: Record<string, number> = {};
  let pillarCount = 0;
  let supportingCount = 0;

  // Fetch topic cluster names if not already included
  const clusterIds = Array.from(new Set(articleRoles.map(r => r.topic_cluster_id)));
  const { data: clusters } = await supabase
    .from('topic_clusters')
    .select('id, cluster_name')
    .in('id', clusterIds);

  const clusterNameMap = new Map<number, string>();
  (clusters || []).forEach(c => {
    clusterNameMap.set(c.id, c.cluster_name);
  });

  // Generate briefs for each article role
  for (const role of articleRoles) {
    try {
      const clusterName = role.cluster_name || clusterNameMap.get(role.topic_cluster_id) || 'Uncategorized';

      // Determine word count based on role
      const isPillar = role.role === 'PILLAR';
      const wordCountMin = isPillar ? 1500 : 800;
      const wordCountMax = isPillar ? 3000 : 1500;

      // Build intent from role and cluster
      const intent = isPillar
        ? `Comprehensive guide covering ${role.primary_keyword} and related subtopics`
        : `Focused deep-dive into ${role.primary_keyword}`;

      // Build summary from section_map for PILLAR articles
      let summary = `Article about ${role.primary_keyword} in the ${clusterName} topic cluster.`;
      if (isPillar && role.section_map && Array.isArray(role.section_map)) {
        const sections = role.section_map.map((s: any) => s.heading).join(', ');
        summary += ` Covers: ${sections}.`;
      }

      // Insert article brief
      const { data: brief, error: briefError } = await supabase
        .from('article_briefs')
        .insert({
          user_token: userToken,
          website_token: websiteToken,
          discovery_article_id: role.discovery_article_id,
          topic_cluster_id: role.topic_cluster_id,
          article_role: role.role,
          title: role.title,
          h1: role.title,
          primary_keyword: role.primary_keyword,
          secondary_keywords: role.secondary_keywords,
          intent,
          summary,
          parent_cluster: clusterName,
          word_count_min: wordCountMin,
          word_count_max: wordCountMax,
          tone: 'professional',
          status: 'draft',
          section_map: role.section_map || null,
          sort_index: isPillar ? 0 : 100, // Pillars first
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (briefError) {
        console.error('[BRIEF GENERATOR] Error creating brief for', role.discovery_article_id, briefError);
        continue;
      }

      if (brief) {
        briefIds.push(brief.id);
        briefIdMap[role.discovery_article_id] = brief.id;

        if (isPillar) {
          pillarCount++;
        } else {
          supportingCount++;
        }

        console.log('[BRIEF GENERATOR] Created brief', brief.id, 'for', role.role, 'article:', role.title);
      }

    } catch (error) {
      console.error('[BRIEF GENERATOR] Error processing article role', role.discovery_article_id, error);
    }
  }

  const result = {
    briefIds,
    briefIdMap,
    pillarCount,
    supportingCount,
    totalGenerated: briefIds.length
  };

  console.log('[BRIEF GENERATOR] Generation complete:', result);

  return result;
}

/**
 * Link generated briefs back to article_roles
 *
 * @param websiteToken - Website identifier
 * @param briefIdMap - Map of discovery_article_id -> brief_id
 */
export async function linkBriefsToArticleRoles(
  websiteToken: string,
  briefIdMap: Record<string, number>
): Promise<void> {
  console.log('[BRIEF GENERATOR] Linking', Object.keys(briefIdMap).length, 'briefs to article_roles');

  for (const [discoveryArticleId, briefId] of Object.entries(briefIdMap)) {
    try {
      const { error } = await supabase
        .from('article_roles')
        .update({ article_brief_id: briefId })
        .eq('discovery_article_id', discoveryArticleId)
        .eq('website_token', websiteToken);

      if (error) {
        console.error('[BRIEF GENERATOR] Error linking brief', briefId, 'to article role', discoveryArticleId, error);
      }
    } catch (error) {
      console.error('[BRIEF GENERATOR] Unexpected error linking brief', briefId, error);
    }
  }

  console.log('[BRIEF GENERATOR] Linking complete');
}
