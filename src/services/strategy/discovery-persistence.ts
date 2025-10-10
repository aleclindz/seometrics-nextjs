/**
 * Discovery Persistence Service
 *
 * Saves Master Discovery results to the database:
 * 1. Creates strategy_discoveries record with full input/output JSON
 * 2. Parses clusters and inserts into topic_clusters
 * 3. Parses articles and inserts into article_roles
 * 4. Updates websites table with strategy initialization status
 * 5. Links article_roles to existing article_briefs/article_queue if found
 */

import { createClient } from '@supabase/supabase-js';
import {
  MasterDiscoveryInput,
  MasterDiscoveryOutput,
  DiscoveryResult
} from './master-discovery';
import {
  generateBriefsFromArticleRoles,
  linkBriefsToArticleRoles,
  ArticleRole
} from './brief-generator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SaveDiscoveryOptions {
  websiteToken: string;
  userToken: string; // Added for brief generation
  discoveryType: 'initial' | 'refresh' | 'manual';
  input: MasterDiscoveryInput;
  result: DiscoveryResult;
}

export interface SaveDiscoveryResponse {
  discoveryId: number;
  clusterIds: Record<string, number>; // cluster_name -> id
  articleRoleIds: Record<string, number>; // discovery_article_id -> id
  briefsGenerated?: number; // Number of briefs auto-generated
  pillarBriefs?: number;
  supportingBriefs?: number;
}

/**
 * Main function to persist discovery results
 */
export async function saveDiscoveryToDatabase(
  options: SaveDiscoveryOptions
): Promise<SaveDiscoveryResponse> {
  const { websiteToken, userToken, discoveryType, input, result } = options;

  console.log('[DISCOVERY PERSISTENCE] Starting save for', websiteToken);

  // Step 1: Create strategy_discoveries record
  const { data: discoveryRecord, error: discoveryError } = await supabase
    .from('strategy_discoveries')
    .insert({
      website_token: websiteToken,
      discovery_type: discoveryType,
      input_site: input.site,
      input_sources: input.sources || null,
      input_controls: input.controls || null,
      output_clusters: result.output.clusters,
      output_articles: result.output.articles,
      output_section_maps: result.output.section_maps || null,
      output_changes: result.output.changes || null,
      scrape_log: result.scrapeLog,
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (discoveryError || !discoveryRecord) {
    console.error('[DISCOVERY PERSISTENCE] Error creating discovery record:', discoveryError);
    throw new Error('Failed to create strategy discovery record');
  }

  const discoveryId = discoveryRecord.id;
  console.log('[DISCOVERY PERSISTENCE] Created discovery record', discoveryId);

  // Step 2: Insert topic clusters
  const clusterIds: Record<string, number> = {};

  for (const cluster of result.output.clusters) {
    const { data: clusterRecord, error: clusterError } = await supabase
      .from('topic_clusters')
      .insert({
        website_token: websiteToken,
        discovery_id: discoveryId,
        cluster_name: cluster.pillar_title,
        primary_keyword: cluster.primary_keyword,
        secondary_keywords: cluster.secondary_keywords,
        notes: cluster.notes || null,
        pillar_count: 0, // Will be updated later
        supporting_count: 0 // Will be updated later
      })
      .select('id')
      .single();

    if (clusterError || !clusterRecord) {
      console.error('[DISCOVERY PERSISTENCE] Error creating cluster:', clusterError);
      throw new Error(`Failed to create topic cluster: ${cluster.pillar_title}`);
    }

    clusterIds[cluster.pillar_title] = clusterRecord.id;
  }

  console.log('[DISCOVERY PERSISTENCE] Created', Object.keys(clusterIds).length, 'clusters');

  // Step 3: Insert article roles and update cluster counts
  const articleRoleIds: Record<string, number> = {};
  const clusterCounts: Record<string, { pillar: number; supporting: number }> = {};

  // Initialize cluster counts
  for (const clusterName of Object.keys(clusterIds)) {
    clusterCounts[clusterName] = { pillar: 0, supporting: 0 };
  }

  for (const article of result.output.articles) {
    const topicClusterId = clusterIds[article.cluster];
    if (!topicClusterId) {
      console.warn('[DISCOVERY PERSISTENCE] No cluster found for article', article.id);
      continue;
    }

    // Try to find existing article_brief with matching primary keyword
    const { data: existingBrief } = await supabase
      .from('article_briefs')
      .select('id')
      .eq('website_token', websiteToken)
      .eq('target_keyword', article.primary_keyword)
      .maybeSingle();

    // Try to find existing article_queue entry
    const { data: existingQueue } = await supabase
      .from('article_queue')
      .select('id')
      .eq('website_token', websiteToken)
      .ilike('title', `%${article.primary_keyword}%`)
      .maybeSingle();

    const { data: articleRoleRecord, error: articleError } = await supabase
      .from('article_roles')
      .insert({
        website_token: websiteToken,
        discovery_id: discoveryId,
        article_brief_id: existingBrief?.id || null,
        article_queue_id: existingQueue?.id || null,
        discovery_article_id: article.id,
        role: article.role,
        title: article.title,
        primary_keyword: article.primary_keyword,
        secondary_keywords: article.secondary_keywords,
        topic_cluster_id: topicClusterId,
        links_to_article_ids: article.links_to || null,
        section_map: article.section_map || null
      })
      .select('id')
      .single();

    if (articleError || !articleRoleRecord) {
      console.error('[DISCOVERY PERSISTENCE] Error creating article role:', articleError);
      throw new Error(`Failed to create article role: ${article.id}`);
    }

    articleRoleIds[article.id] = articleRoleRecord.id;

    // Update cluster counts
    if (article.role === 'PILLAR') {
      clusterCounts[article.cluster].pillar++;
    } else {
      clusterCounts[article.cluster].supporting++;
    }

    // If article_brief exists, update it with strategy metadata
    if (existingBrief?.id) {
      await supabase
        .from('article_briefs')
        .update({
          article_role: article.role,
          discovery_article_id: article.id,
          topic_cluster_id: topicClusterId,
          section_map: article.section_map || null
        })
        .eq('id', existingBrief.id);
    }

    // If article_queue exists, update it with strategy metadata
    if (existingQueue?.id) {
      await supabase
        .from('article_queue')
        .update({
          discovery_article_id: article.id,
          article_role: article.role
        })
        .eq('id', existingQueue.id);
    }
  }

  console.log('[DISCOVERY PERSISTENCE] Created', Object.keys(articleRoleIds).length, 'article roles');

  // Step 4: Update topic_clusters with accurate counts
  for (const [clusterName, clusterId] of Object.entries(clusterIds)) {
    const counts = clusterCounts[clusterName];
    await supabase
      .from('topic_clusters')
      .update({
        pillar_count: counts.pillar,
        supporting_count: counts.supporting
      })
      .eq('id', clusterId);
  }

  // Step 5: Update websites table with strategy initialization status
  await supabase
    .from('websites')
    .update({
      strategy_initialized: true,
      strategy_initialized_at: new Date().toISOString(),
      last_discovery_id: discoveryId
    })
    .eq('website_token', websiteToken);

  console.log('[DISCOVERY PERSISTENCE] Updated website strategy status');

  // Step 6: Auto-generate article briefs from article roles
  console.log('[DISCOVERY PERSISTENCE] Auto-generating article briefs...');

  let briefsGenerated = 0;
  let pillarBriefs = 0;
  let supportingBriefs = 0;

  try {
    // Fetch article roles with cluster names for brief generation
    const { data: articleRolesWithClusters, error: rolesError } = await supabase
      .from('article_roles')
      .select(`
        *,
        topic_clusters!article_roles_topic_cluster_id_fkey (
          cluster_name
        )
      `)
      .eq('website_token', websiteToken)
      .eq('discovery_id', discoveryId);

    if (rolesError) {
      console.error('[DISCOVERY PERSISTENCE] Error fetching article roles:', rolesError);
    } else if (articleRolesWithClusters && articleRolesWithClusters.length > 0) {
      // Transform to ArticleRole format
      const articleRolesForBriefGen: ArticleRole[] = articleRolesWithClusters.map(role => ({
        id: role.id,
        discovery_article_id: role.discovery_article_id,
        role: role.role as 'PILLAR' | 'SUPPORTING',
        title: role.title,
        primary_keyword: role.primary_keyword,
        secondary_keywords: role.secondary_keywords || [],
        topic_cluster_id: role.topic_cluster_id,
        cluster_name: role.topic_clusters?.cluster_name,
        section_map: role.section_map,
        links_to_article_ids: role.links_to_article_ids || []
      }));

      // Generate briefs
      const briefResult = await generateBriefsFromArticleRoles(
        websiteToken,
        userToken,
        discoveryId,
        articleRolesForBriefGen
      );

      briefsGenerated = briefResult.totalGenerated;
      pillarBriefs = briefResult.pillarCount;
      supportingBriefs = briefResult.supportingCount;

      // Link briefs back to article roles
      await linkBriefsToArticleRoles(websiteToken, briefResult.briefIdMap);

      console.log('[DISCOVERY PERSISTENCE] Auto-generated', briefsGenerated, 'briefs:', {
        pillar: pillarBriefs,
        supporting: supportingBriefs
      });
    }
  } catch (error) {
    console.error('[DISCOVERY PERSISTENCE] Error auto-generating briefs:', error);
    // Don't fail the entire discovery process if brief generation fails
  }

  return {
    discoveryId,
    clusterIds,
    articleRoleIds,
    briefsGenerated,
    pillarBriefs,
    supportingBriefs
  };
}

/**
 * Get strategy status for a website
 */
export async function getStrategyStatus(websiteToken: string) {
  const { data, error } = await supabase
    .from('strategy_status_overview')
    .select('*')
    .eq('website_token', websiteToken)
    .single();

  if (error) {
    console.error('[DISCOVERY PERSISTENCE] Error fetching strategy status:', error);
    return null;
  }

  return data;
}

/**
 * Get all clusters for a website
 */
export async function getWebsiteClusters(websiteToken: string) {
  const { data, error } = await supabase
    .from('cluster_details_view')
    .select('*')
    .eq('website_token', websiteToken)
    .order('cluster_name');

  if (error) {
    console.error('[DISCOVERY PERSISTENCE] Error fetching clusters:', error);
    return [];
  }

  return data;
}

/**
 * Get all article roles for a website
 */
export async function getWebsiteArticleRoles(websiteToken: string) {
  const { data, error } = await supabase
    .from('article_roles')
    .select('*')
    .eq('website_token', websiteToken)
    .order('created_at');

  if (error) {
    console.error('[DISCOVERY PERSISTENCE] Error fetching article roles:', error);
    return [];
  }

  return data;
}

/**
 * Get article roles for a specific cluster
 */
export async function getClusterArticles(
  websiteToken: string,
  topicClusterId: number
) {
  const { data, error } = await supabase
    .from('article_roles')
    .select('*')
    .eq('website_token', websiteToken)
    .eq('topic_cluster_id', topicClusterId)
    .order('role', { ascending: false }); // PILLARs first

  if (error) {
    console.error('[DISCOVERY PERSISTENCE] Error fetching cluster articles:', error);
    return [];
  }

  return data;
}

/**
 * Get the latest discovery run for a website
 */
export async function getLatestDiscovery(websiteToken: string) {
  const { data, error } = await supabase
    .from('strategy_discoveries')
    .select('*')
    .eq('website_token', websiteToken)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[DISCOVERY PERSISTENCE] Error fetching latest discovery:', error);
    return null;
  }

  return data;
}

/**
 * Delete all strategy data for a website (for re-discovery)
 */
export async function clearWebsiteStrategy(websiteToken: string) {
  console.log('[DISCOVERY PERSISTENCE] Clearing strategy for', websiteToken);

  // Delete article_roles (cascades won't handle this due to nullable FKs)
  await supabase
    .from('article_roles')
    .delete()
    .eq('website_token', websiteToken);

  // Delete topic_clusters
  await supabase
    .from('topic_clusters')
    .delete()
    .eq('website_token', websiteToken);

  // Delete strategy_discoveries
  await supabase
    .from('strategy_discoveries')
    .delete()
    .eq('website_token', websiteToken);

  // Reset website strategy status
  await supabase
    .from('websites')
    .update({
      strategy_initialized: false,
      strategy_initialized_at: null,
      last_discovery_id: null
    })
    .eq('website_token', websiteToken);

  console.log('[DISCOVERY PERSISTENCE] Strategy cleared');
}

/**
 * Create article briefs from discovery article roles
 * This generates actual article briefs for articles that don't have them yet
 */
export async function createBriefsFromDiscovery(
  websiteToken: string,
  articleIds?: string[] // Optional: only create briefs for specific article IDs
) {
  const { data: articleRoles, error } = await supabase
    .from('article_roles')
    .select('*')
    .eq('website_token', websiteToken)
    .is('article_brief_id', null); // Only get articles without briefs

  if (error || !articleRoles) {
    console.error('[DISCOVERY PERSISTENCE] Error fetching article roles for briefs:', error);
    return { created: 0, errors: [] };
  }

  let filteredRoles = articleRoles;
  if (articleIds && articleIds.length > 0) {
    filteredRoles = articleRoles.filter(role => articleIds.includes(role.discovery_article_id));
  }

  const created: number[] = [];
  const errors: string[] = [];

  for (const role of filteredRoles) {
    try {
      // Create article brief
      const { data: brief, error: briefError } = await supabase
        .from('article_briefs')
        .insert({
          website_token: websiteToken,
          target_keyword: role.primary_keyword,
          target_keyword_ids: [], // TODO: Link to website_keywords if they exist
          coverage_keywords: {
            primary: role.primary_keyword,
            secondary: role.secondary_keywords
          },
          article_role: role.role,
          discovery_article_id: role.discovery_article_id,
          topic_cluster_id: role.topic_cluster_id,
          section_map: role.section_map,
          status: 'pending'
        })
        .select('id')
        .single();

      if (briefError || !brief) {
        errors.push(`Failed to create brief for ${role.discovery_article_id}: ${briefError?.message}`);
        continue;
      }

      // Update article_role with brief_id
      await supabase
        .from('article_roles')
        .update({ article_brief_id: brief.id })
        .eq('id', role.id);

      created.push(brief.id);
    } catch (error) {
      errors.push(`Exception creating brief for ${role.discovery_article_id}: ${error}`);
    }
  }

  console.log('[DISCOVERY PERSISTENCE] Created', created.length, 'briefs from discovery');
  if (errors.length > 0) {
    console.error('[DISCOVERY PERSISTENCE] Errors:', errors);
  }

  return { created: created.length, errors };
}
