/**
 * Programmatic Brief Generator
 *
 * Generates multiple content briefs based on templates and term lists.
 * Handles permutations, deduplication, and cannibalization prevention.
 */

import { createClient } from '@supabase/supabase-js';
import { extractTemplatePlaceholders } from './programmatic-pattern-detector';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ProgrammaticBriefConfig {
  template: string;
  term_lists: Record<string, string[]>;
  pattern_type: 'location' | 'product' | 'category' | 'comparison' | 'custom';
  website_token: string;
  user_token: string;
  max_briefs?: number;
  deduplicate?: boolean;
  parent_cluster?: string | null;
}

export interface GeneratedBrief {
  title: string;
  h1: string;
  url_path: string;
  primary_keyword: string;
  secondary_keywords: string[];
  intent: string;
  summary: string;
  word_count_min: number;
  word_count_max: number;
  tone: string;
  page_type: string;
  parent_cluster: string | null;
  is_programmatic: boolean;
  template_used: string;
}

export interface ProgrammaticGenerationResult {
  success: boolean;
  briefs: GeneratedBrief[];
  total_generated: number;
  skipped_duplicates: number;
  error?: string;
  permutation_group_id: string;
}

/**
 * Generate programmatic briefs from template and term lists
 */
export async function generateProgrammaticBriefs(
  config: ProgrammaticBriefConfig
): Promise<ProgrammaticGenerationResult> {
  const {
    template,
    term_lists,
    pattern_type,
    website_token,
    user_token,
    max_briefs = 100,
    deduplicate = true,
    parent_cluster = null
  } = config;

  try {
    // 1. Generate all permutations
    const permutations = generatePermutations(template, term_lists);

    // 2. Limit to max_briefs
    const limited = permutations.slice(0, max_briefs);

    // 3. Fetch existing keywords for deduplication
    let existingKeywords: Set<string> = new Set();
    if (deduplicate) {
      existingKeywords = await fetchExistingKeywords(website_token);
    }

    // 4. Generate briefs for each permutation
    const briefs: GeneratedBrief[] = [];
    let skipped = 0;
    const permutationGroupId = generateUUID();

    for (const perm of limited) {
      const primaryKeyword = perm.toLowerCase().trim();

      // Skip if duplicate
      if (deduplicate && existingKeywords.has(primaryKeyword)) {
        skipped++;
        continue;
      }

      const brief = createBriefFromPermutation(
        perm,
        pattern_type,
        template,
        parent_cluster
      );

      briefs.push(brief);
      existingKeywords.add(primaryKeyword); // Prevent duplicates within this batch
    }

    // 5. Save to database
    if (briefs.length > 0) {
      await saveBriefsToDatabase(briefs, user_token, website_token, permutationGroupId);
    }

    return {
      success: true,
      briefs,
      total_generated: briefs.length,
      skipped_duplicates: skipped,
      permutation_group_id: permutationGroupId
    };
  } catch (error) {
    console.error('[PROGRAMMATIC GENERATOR] Error:', error);
    return {
      success: false,
      briefs: [],
      total_generated: 0,
      skipped_duplicates: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      permutation_group_id: ''
    };
  }
}

/**
 * Generate all permutations from template and term lists
 */
function generatePermutations(template: string, termLists: Record<string, string[]>): string[] {
  const placeholders = extractTemplatePlaceholders(template);

  if (placeholders.length === 0) {
    return [template];
  }

  // Handle special case: comparison pairs
  if (termLists.item_pairs) {
    return termLists.item_pairs.map(pair => {
      const [a, b] = pair.split('|');
      return template
        .replace('{item_a}', a)
        .replace('{item_b}', b);
    });
  }

  // Generate cartesian product of all term lists
  const listArrays = placeholders.map(ph => termLists[ph] || []);

  if (listArrays.some(arr => arr.length === 0)) {
    console.warn('[PERMUTATIONS] Empty term list detected');
    return [];
  }

  const permutations = cartesianProduct(listArrays);

  return permutations.map(values => {
    let result = template;
    placeholders.forEach((ph, index) => {
      result = result.replace(`{${ph}}`, values[index]);
    });
    return result;
  });
}

/**
 * Generate cartesian product of arrays
 * Example: [[A,B], [1,2]] → [[A,1], [A,2], [B,1], [B,2]]
 */
function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  if (arrays.length === 1) return arrays[0].map(item => [item]);

  const [first, ...rest] = arrays;
  const restProduct = cartesianProduct(rest);

  return first.flatMap(item =>
    restProduct.map(restItems => [item, ...restItems])
  );
}

/**
 * Create a brief object from a permutation string
 */
function createBriefFromPermutation(
  permutation: string,
  patternType: string,
  template: string,
  parentCluster: string | null
): GeneratedBrief {
  const title = capitalizeTitle(permutation);
  const primaryKeyword = permutation.toLowerCase();
  const slug = slugify(permutation);
  const urlPath = parentCluster
    ? `/${slugify(parentCluster)}/${slug}`
    : `/${slug}`;

  // Determine intent based on pattern type
  const intent = inferIntent(patternType, permutation);

  // Generate secondary keywords (variations)
  const secondaryKeywords = generateSecondaryKeywords(permutation, patternType);

  // Determine word count based on pattern
  const [wordCountMin, wordCountMax] = determineWordCount(patternType);

  // Generate summary
  const summary = generateSummary(permutation, patternType, intent);

  return {
    title,
    h1: title,
    url_path: urlPath,
    primary_keyword: primaryKeyword,
    secondary_keywords: secondaryKeywords,
    intent,
    summary,
    word_count_min: wordCountMin,
    word_count_max: wordCountMax,
    tone: 'professional',
    page_type: 'cluster',
    parent_cluster: parentCluster,
    is_programmatic: true,
    template_used: template
  };
}

/**
 * Infer search intent from pattern type and content
 */
function inferIntent(patternType: string, permutation: string): string {
  const lower = permutation.toLowerCase();

  if (patternType === 'comparison' || lower.includes('vs') || lower.includes('versus')) {
    return 'comparison';
  }

  if (lower.includes('best') || lower.includes('top') || lower.includes('review')) {
    return 'commercial';
  }

  if (lower.includes('how to') || lower.includes('guide')) {
    return 'informational';
  }

  if (lower.includes('buy') || lower.includes('price') || lower.includes('cost')) {
    return 'transactional';
  }

  // Default based on pattern type
  switch (patternType) {
    case 'location':
      return 'local';
    case 'product':
      return 'commercial';
    case 'category':
      return 'informational';
    default:
      return 'informational';
  }
}

/**
 * Generate secondary keywords (variations of primary)
 */
function generateSecondaryKeywords(primary: string, patternType: string): string[] {
  const keywords: string[] = [];
  const base = primary.toLowerCase();

  // Add "best" variation if not present
  if (!base.includes('best')) {
    keywords.push(`best ${base}`);
  }

  // Add "top" variation
  if (!base.includes('top')) {
    keywords.push(`top ${base}`);
  }

  // Add year variation for evergreen content
  const currentYear = new Date().getFullYear();
  keywords.push(`${base} ${currentYear}`);

  // Pattern-specific variations
  if (patternType === 'location') {
    keywords.push(`${base} near me`);
  }

  if (patternType === 'product') {
    keywords.push(`${base} review`);
    keywords.push(`${base} guide`);
  }

  return keywords.slice(0, 4); // Limit to 4 secondary keywords
}

/**
 * Determine word count range based on pattern type
 */
function determineWordCount(patternType: string): [number, number] {
  switch (patternType) {
    case 'comparison':
      return [2000, 3000]; // Comparisons need more detail
    case 'product':
      return [1500, 2500]; // Product reviews/guides
    case 'location':
      return [1200, 2000]; // Location pages can be shorter
    case 'category':
      return [1500, 2500]; // Category overviews
    default:
      return [1500, 2500];
  }
}

/**
 * Generate brief summary
 */
function generateSummary(permutation: string, patternType: string, intent: string): string {
  const summaries: Record<string, string> = {
    comparison: `Comprehensive comparison of ${permutation}. Detailed analysis of features, pricing, pros and cons to help you make an informed decision.`,
    product: `In-depth guide to ${permutation}. Covers features, benefits, use cases, and expert recommendations.`,
    location: `Complete guide to ${permutation}. Includes local insights, recommendations, and what you need to know.`,
    category: `Ultimate guide to ${permutation}. Everything you need to know about this category.`
  };

  return summaries[patternType] || `Comprehensive guide to ${permutation}.`;
}

/**
 * Fetch existing keywords to prevent duplication
 */
async function fetchExistingKeywords(websiteToken: string): Promise<Set<string>> {
  try {
    // Fetch from article_briefs
    const { data: briefs } = await supabase
      .from('article_briefs')
      .select('primary_keyword')
      .eq('website_token', websiteToken);

    // Fetch from website_keywords
    const { data: keywords } = await supabase
      .from('website_keywords')
      .select('keyword')
      .eq('website_token', websiteToken);

    const existing = new Set<string>();

    (briefs || []).forEach(b => {
      if (b.primary_keyword) {
        existing.add(b.primary_keyword.toLowerCase());
      }
    });

    (keywords || []).forEach(k => {
      if (k.keyword) {
        existing.add(k.keyword.toLowerCase());
      }
    });

    return existing;
  } catch (error) {
    console.error('[FETCH KEYWORDS] Error:', error);
    return new Set();
  }
}

/**
 * Save generated briefs to database
 */
async function saveBriefsToDatabase(
  briefs: GeneratedBrief[],
  userToken: string,
  websiteToken: string,
  permutationGroupId: string
): Promise<void> {
  try {
    const rows = briefs.map((brief, index) => ({
      user_token: userToken,
      website_token: websiteToken,
      title: brief.title,
      h1: brief.h1,
      url_path: brief.url_path,
      primary_keyword: brief.primary_keyword,
      secondary_keywords: brief.secondary_keywords,
      intent: brief.intent,
      summary: brief.summary,
      word_count_min: brief.word_count_min,
      word_count_max: brief.word_count_max,
      tone: brief.tone,
      page_type: brief.page_type,
      parent_cluster: brief.parent_cluster,
      status: 'draft',
      sort_index: index,
      notes: [
        'Generated via programmatic SEO',
        `Template: ${brief.template_used}`,
        `Permutation group: ${permutationGroupId}`
      ],
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('article_briefs')
      .insert(rows);

    if (error) {
      console.error('[SAVE BRIEFS] Database error:', error);
      throw error;
    }

    console.log(`[SAVE BRIEFS] Successfully saved ${rows.length} briefs`);
  } catch (error) {
    console.error('[SAVE BRIEFS] Error saving briefs:', error);
    throw error;
  }
}

/**
 * Utility: Slugify string for URL
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Utility: Capitalize title properly
 */
function capitalizeTitle(str: string): string {
  const lowercaseWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by', 'in', 'of', 'vs']);

  return str
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      // Always capitalize first and last word
      if (index === 0 || !lowercaseWords.has(lower)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return lower;
    })
    .join(' ');
}

/**
 * Utility: Generate UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
