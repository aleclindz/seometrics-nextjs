/**
 * Keyword Similarity Service
 *
 * Uses OpenAI embeddings to calculate semantic similarity between keywords
 * and group them for comprehensive article planning
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY']
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Generate embedding for a single keyword
 */
export async function generateKeywordEmbedding(keyword: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: keyword,
      encoding_format: 'float'
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('[KEYWORD SIMILARITY] Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple keywords in batch
 */
export async function generateBatchEmbeddings(keywords: string[]): Promise<Map<string, number[]>> {
  const embeddings = new Map<string, number[]>();

  try {
    // OpenAI allows up to 2048 inputs per request, but we'll batch conservatively
    const batchSize = 100;

    for (let i = 0; i < keywords.length; i += batchSize) {
      const batch = keywords.slice(i, i + batchSize);

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
        encoding_format: 'float'
      });

      batch.forEach((keyword, idx) => {
        embeddings.set(keyword, response.data[idx].embedding);
      });

      // Rate limiting: small delay between batches
      if (i + batchSize < keywords.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return embeddings;
  } catch (error) {
    console.error('[KEYWORD SIMILARITY] Error generating batch embeddings:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Group keywords by semantic similarity
 * Returns groups of keywords that should be covered in the same article
 */
export interface KeywordGroup {
  groupId: number;
  primaryKeyword: string;
  secondaryKeywords: string[];
  averageSimilarity: number;
}

export async function clusterKeywordsBySimilarity(
  keywords: string[],
  similarityThreshold: number = 0.75,
  targetArticleCount?: number
): Promise<KeywordGroup[]> {
  if (keywords.length === 0) {
    return [];
  }

  if (keywords.length === 1) {
    return [{
      groupId: 1,
      primaryKeyword: keywords[0],
      secondaryKeywords: [],
      averageSimilarity: 1.0
    }];
  }

  console.log('[KEYWORD CLUSTERING] Generating embeddings for', keywords.length, 'keywords');

  // Generate embeddings for all keywords
  const embeddings = await generateBatchEmbeddings(keywords);

  // Build similarity matrix
  const similarityMatrix: number[][] = [];
  for (let i = 0; i < keywords.length; i++) {
    similarityMatrix[i] = [];
    for (let j = 0; j < keywords.length; j++) {
      if (i === j) {
        similarityMatrix[i][j] = 1.0;
      } else {
        const embA = embeddings.get(keywords[i])!;
        const embB = embeddings.get(keywords[j])!;
        similarityMatrix[i][j] = cosineSimilarity(embA, embB);
      }
    }
  }

  // Simple agglomerative clustering
  const groups: Set<number>[] = [];
  const assigned = new Set<number>();

  // Sort keywords by connectivity (how many similar keywords they have)
  const connectivity = keywords.map((keyword, idx) => ({
    idx,
    keyword,
    connections: similarityMatrix[idx].filter(sim => sim >= similarityThreshold).length
  })).sort((a, b) => b.connections - a.connections);

  for (const { idx: centerIdx } of connectivity) {
    if (assigned.has(centerIdx)) continue;

    // Start new group with this keyword as center
    const group = new Set<number>([centerIdx]);
    assigned.add(centerIdx);

    // Add similar keywords to this group
    for (let j = 0; j < keywords.length; j++) {
      if (j === centerIdx || assigned.has(j)) continue;

      if (similarityMatrix[centerIdx][j] >= similarityThreshold) {
        // Check if this keyword is also similar to other group members
        let avgSimilarity = similarityMatrix[centerIdx][j];
        let count = 1;

        for (const memberIdx of Array.from(group)) {
          if (memberIdx !== centerIdx) {
            avgSimilarity += similarityMatrix[memberIdx][j];
            count++;
          }
        }
        avgSimilarity /= count;

        if (avgSimilarity >= similarityThreshold) {
          group.add(j);
          assigned.add(j);
        }
      }
    }

    groups.push(group);

    // If we have a target article count and reached it, stop creating groups
    if (targetArticleCount && groups.length >= targetArticleCount) {
      break;
    }
  }

  // Assign remaining unassigned keywords to nearest group or create singleton groups
  for (let i = 0; i < keywords.length; i++) {
    if (assigned.has(i)) continue;

    // Find most similar existing group
    let bestGroupIdx = -1;
    let bestSimilarity = -1;

    for (let gIdx = 0; gIdx < groups.length; gIdx++) {
      let totalSim = 0;
      let count = 0;

      for (const memberIdx of Array.from(groups[gIdx])) {
        totalSim += similarityMatrix[i][memberIdx];
        count++;
      }

      const avgSim = totalSim / count;
      if (avgSim > bestSimilarity) {
        bestSimilarity = avgSim;
        bestGroupIdx = gIdx;
      }
    }

    // Add to best group if similarity is reasonable, otherwise create new group
    if (bestSimilarity >= similarityThreshold * 0.8 && groups[bestGroupIdx].size < 10) {
      groups[bestGroupIdx].add(i);
    } else {
      groups.push(new Set([i]));
    }
  }

  // Convert groups to output format
  const result: KeywordGroup[] = [];

  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const group = Array.from(groups[gIdx]);

    if (group.length === 0) continue;

    // Primary keyword is the one with highest average similarity to others in group
    let bestPrimaryIdx = group[0];
    let bestAvgSim = 0;

    for (const candidateIdx of group) {
      let totalSim = 0;
      for (const memberIdx of group) {
        if (candidateIdx !== memberIdx) {
          totalSim += similarityMatrix[candidateIdx][memberIdx];
        }
      }
      const avgSim = group.length > 1 ? totalSim / (group.length - 1) : 1.0;

      if (avgSim > bestAvgSim) {
        bestAvgSim = avgSim;
        bestPrimaryIdx = candidateIdx;
      }
    }

    const secondaryKeywords = group
      .filter(idx => idx !== bestPrimaryIdx)
      .map(idx => keywords[idx]);

    // Calculate average similarity within group
    let totalGroupSim = 0;
    let pairCount = 0;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        totalGroupSim += similarityMatrix[group[i]][group[j]];
        pairCount++;
      }
    }
    const avgGroupSim = pairCount > 0 ? totalGroupSim / pairCount : 1.0;

    result.push({
      groupId: gIdx + 1,
      primaryKeyword: keywords[bestPrimaryIdx],
      secondaryKeywords,
      averageSimilarity: parseFloat(avgGroupSim.toFixed(3))
    });
  }

  console.log(`[KEYWORD CLUSTERING] Created ${result.length} groups from ${keywords.length} keywords`);

  return result;
}

/**
 * Store keyword similarity groups in database
 */
export async function storeSimilarityGroups(
  websiteToken: string,
  topicCluster: string,
  groups: KeywordGroup[]
): Promise<void> {
  try {
    // Delete existing groups for this cluster
    await supabase
      .from('keyword_similarity_groups')
      .delete()
      .eq('website_token', websiteToken)
      .eq('topic_cluster', topicCluster);

    // Insert new groups
    const records = groups.map(group => ({
      website_token: websiteToken,
      topic_cluster: topicCluster,
      group_id: group.groupId,
      keywords: [group.primaryKeyword, ...group.secondaryKeywords],
      primary_keyword: group.primaryKeyword,
      secondary_keywords: group.secondaryKeywords,
      average_similarity_score: group.averageSimilarity,
      recommended_article_count: 1 // One article per group
    }));

    const { error } = await supabase
      .from('keyword_similarity_groups')
      .insert(records);

    if (error) {
      console.error('[KEYWORD CLUSTERING] Error storing groups:', error);
      throw error;
    }

    console.log(`[KEYWORD CLUSTERING] Stored ${groups.length} similarity groups for ${topicCluster}`);
  } catch (error) {
    console.error('[KEYWORD CLUSTERING] Error in storeSimilarityGroups:', error);
    throw error;
  }
}

/**
 * Update keyword embeddings in database
 */
export async function updateKeywordEmbeddings(
  websiteToken: string,
  keywords: Map<string, number[]>
): Promise<void> {
  try {
    for (const [keyword, embedding] of Array.from(keywords.entries())) {
      const { error } = await supabase
        .from('website_keywords')
        .update({ embedding: `[${embedding.join(',')}]` })
        .eq('website_token', websiteToken)
        .eq('keyword', keyword);

      if (error) {
        console.error(`[KEYWORD CLUSTERING] Error updating embedding for "${keyword}":`, error);
      }
    }

    console.log(`[KEYWORD CLUSTERING] Updated embeddings for ${keywords.size} keywords`);
  } catch (error) {
    console.error('[KEYWORD CLUSTERING] Error in updateKeywordEmbeddings:', error);
    throw error;
  }
}
