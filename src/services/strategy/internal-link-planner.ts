/**
 * Internal Link Planner Service
 * 
 * Generates strategic internal linking plans during brief creation.
 * Plans are stored with briefs and resolved to actual URLs during publishing.
 * 
 * SEO Strategy:
 * - PILLAR articles link to 3-5 supporting articles in same cluster
 * - SUPPORTING articles link to 1 pillar + 2-3 sibling articles
 * - Max 5-8 links per article based on word count (~1 per 150 words)
 * - Varied anchor text: 1 exact match, 2-3 partial, rest descriptive
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// Types
// ============================================================================

export interface RecommendedLink {
  target_discovery_article_id: string | null;
  target_brief_id: number | null;
  anchor_hint: string;
  link_type: 'pillar' | 'sibling' | 'supporting_to_pillar';
  reason: string;
}

export interface InternalLinkPlan {
  recommended_links: RecommendedLink[];
  max_links: number;
  priority_order: string[];
}

interface LinkableArticle {
  brief_id: number;
  discovery_article_id: string | null;
  article_role: 'PILLAR' | 'SUPPORTING' | null;
  title: string;
  primary_keyword: string;
  secondary_keywords: string[];
  topic_cluster_id: number;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generate internal link plan for a newly created brief
 */
export async function generateInternalLinkPlan(
  briefId: number,
  articleRole: 'PILLAR' | 'SUPPORTING' | null,
  topicClusterId: number | null,
  discoveryArticleId: string | null,
  wordCountMax: number = 2000
): Promise<InternalLinkPlan | null> {
  console.log('[LINK PLANNER] Generating plan for brief', briefId, 'role:', articleRole);

  // Skip if no cluster or role information
  if (!topicClusterId || !articleRole) {
    console.log('[LINK PLANNER] Skipping - missing cluster or role info');
    return null;
  }

  // Calculate max links based on word count
  const maxLinks = calculateMaxLinks(wordCountMax);

  // Find other articles in the same cluster
  const linkableArticles = await findLinkableArticles(topicClusterId, briefId);

  if (linkableArticles.length === 0) {
    console.log('[LINK PLANNER] No linkable articles found in cluster');
    return {
      recommended_links: [],
      max_links: maxLinks,
      priority_order: articleRole === 'PILLAR' 
        ? ['supporting_to_pillar', 'sibling'] 
        : ['pillar', 'sibling', 'supporting_to_pillar']
    };
  }

  // Generate links based on article role
  let recommendedLinks: RecommendedLink[] = [];

  if (articleRole === 'PILLAR') {
    recommendedLinks = await generatePillarLinks(linkableArticles, maxLinks);
  } else if (articleRole === 'SUPPORTING') {
    recommendedLinks = await generateSupportingLinks(linkableArticles, discoveryArticleId, maxLinks);
  }

  const plan: InternalLinkPlan = {
    recommended_links: recommendedLinks,
    max_links: maxLinks,
    priority_order: articleRole === 'PILLAR'
      ? ['supporting_to_pillar', 'sibling']
      : ['pillar', 'sibling', 'supporting_to_pillar']
  };

  console.log('[LINK PLANNER] Generated plan with', recommendedLinks.length, 'links');

  return plan;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate maximum links based on estimated word count
 * Rule: ~1 link per 150 words, capped between 3-8
 */
function calculateMaxLinks(wordCount: number): number {
  const calculated = Math.floor(wordCount / 150);
  return Math.max(3, Math.min(8, calculated));
}

/**
 * Find other briefs in the same topic cluster that can be linked to
 */
async function findLinkableArticles(
  topicClusterId: number,
  excludeBriefId: number
): Promise<LinkableArticle[]> {
  const { data, error } = await supabase
    .from('article_briefs')
    .select('id, discovery_article_id, article_role, title, primary_keyword, secondary_keywords, topic_cluster_id')
    .eq('topic_cluster_id', topicClusterId)
    .neq('id', excludeBriefId)
    .in('status', ['draft', 'queued', 'generated', 'published']);

  if (error) {
    console.error('[LINK PLANNER] Error fetching linkable articles:', error);
    return [];
  }

  return (data || []).map(article => ({
    brief_id: article.id,
    discovery_article_id: article.discovery_article_id,
    article_role: article.article_role as 'PILLAR' | 'SUPPORTING' | null,
    title: article.title,
    primary_keyword: article.primary_keyword,
    secondary_keywords: Array.isArray(article.secondary_keywords) ? article.secondary_keywords : [],
    topic_cluster_id: article.topic_cluster_id!
  }));
}

/**
 * Generate links for a PILLAR article
 * Strategy: Link to 3-5 best supporting articles in cluster
 */
async function generatePillarLinks(
  linkableArticles: LinkableArticle[],
  maxLinks: number
): Promise<RecommendedLink[]> {
  // Find supporting articles
  const supportingArticles = linkableArticles.filter(
    article => article.article_role === 'SUPPORTING'
  );

  // Take up to maxLinks supporting articles
  const selectedArticles = supportingArticles.slice(0, maxLinks);

  return selectedArticles.map((article, index) => {
    const anchorHints = generateAnchorHints(article);
    const anchorType = index === 0 ? 'exact' : index <= 2 ? 'partial' : 'descriptive';
    
    return {
      target_discovery_article_id: article.discovery_article_id,
      target_brief_id: article.brief_id,
      anchor_hint: anchorHints[anchorType] || article.title,
      link_type: 'supporting_to_pillar' as const,
      reason: `Pillar links to supporting article about ${article.primary_keyword}`
    };
  });
}

/**
 * Generate links for a SUPPORTING article
 * Strategy: Link to 1 pillar + 2-3 sibling articles
 */
async function generateSupportingLinks(
  linkableArticles: LinkableArticle[],
  discoveryArticleId: string | null,
  maxLinks: number
): Promise<RecommendedLink[]> {
  const links: RecommendedLink[] = [];

  // 1. Find and link to pillar article
  const pillarArticle = linkableArticles.find(
    article => article.article_role === 'PILLAR'
  );

  if (pillarArticle) {
    const pillarAnchors = generateAnchorHints(pillarArticle);
    links.push({
      target_discovery_article_id: pillarArticle.discovery_article_id,
      target_brief_id: pillarArticle.brief_id,
      anchor_hint: pillarAnchors.descriptive || pillarArticle.title,
      link_type: 'pillar',
      reason: `Supporting article links to pillar about ${pillarArticle.primary_keyword}`
    });
  }

  // 2. Link to sibling supporting articles
  const siblingArticles = linkableArticles.filter(
    article => article.article_role === 'SUPPORTING' && 
               article.discovery_article_id !== discoveryArticleId
  );

  // Take 2-3 siblings (or remaining slots)
  const remainingSlots = maxLinks - links.length;
  const siblingsToLink = Math.min(3, remainingSlots);
  const selectedSiblings = siblingArticles.slice(0, siblingsToLink);

  selectedSiblings.forEach((article, index) => {
    const anchorHints = generateAnchorHints(article);
    const anchorType = index === 0 ? 'partial' : 'descriptive';
    
    links.push({
      target_discovery_article_id: article.discovery_article_id,
      target_brief_id: article.brief_id,
      anchor_hint: anchorHints[anchorType] || article.title,
      link_type: 'sibling',
      reason: `Related sibling article about ${article.primary_keyword}`
    });
  });

  return links;
}

/**
 * Generate anchor text hints for a target article
 * Returns variations: exact, partial, and descriptive
 */
function generateAnchorHints(article: LinkableArticle): {
  exact: string;
  partial: string;
  descriptive: string;
} {
  const keyword = article.primary_keyword;
  const title = article.title;

  // Exact: Use primary keyword as-is
  const exact = keyword;

  // Partial: Add qualifiers from title or generic terms
  const partial = generatePartialAnchor(keyword, title);

  // Descriptive: Natural language from title
  const descriptive = generateDescriptiveAnchor(title, keyword);

  return { exact, partial, descriptive };
}

/**
 * Generate partial match anchor (keyword + qualifier)
 */
function generatePartialAnchor(keyword: string, title: string): string {
  // Try to extract a qualifier from the title
  const titleWords = title.toLowerCase().split(/\s+/);
  const keywordWords = keyword.toLowerCase().split(/\s+/);
  
  // Find words in title that aren't in keyword
  const qualifiers = ['guide', 'checklist', 'tips', 'examples', 'best practices'];
  const foundQualifier = titleWords.find(word => 
    qualifiers.includes(word) && !keywordWords.includes(word)
  );

  if (foundQualifier) {
    return `${keyword} ${foundQualifier}`;
  }

  // Default to adding "guide"
  return `${keyword} guide`;
}

/**
 * Generate descriptive anchor (natural language)
 */
function generateDescriptiveAnchor(title: string, keyword: string): string {
  // Try to extract a meaningful phrase from the title
  // Remove common prefixes like "How to", "The", "A Complete"
  let descriptive = title
    .replace(/^(how to|the|a complete|ultimate|comprehensive)\s+/i, '')
    .trim();

  // If still too long, try to get the first 5-7 words
  const words = descriptive.split(/\s+/);
  if (words.length > 7) {
    descriptive = words.slice(0, 7).join(' ');
  }

  // Fallback to keyword-based description
  if (!descriptive || descriptive === title) {
    return `learn about ${keyword}`;
  }

  return descriptive.toLowerCase();
}

/**
 * Prioritize and sort links by type based on article role
 */
export function prioritizeLinksByType(
  links: RecommendedLink[],
  articleRole: 'PILLAR' | 'SUPPORTING'
): RecommendedLink[] {
  const priorityOrder = articleRole === 'PILLAR'
    ? ['supporting_to_pillar', 'sibling']
    : ['pillar', 'sibling', 'supporting_to_pillar'];

  return links.sort((a, b) => {
    const aPriority = priorityOrder.indexOf(a.link_type);
    const bPriority = priorityOrder.indexOf(b.link_type);
    return aPriority - bPriority;
  });
}

