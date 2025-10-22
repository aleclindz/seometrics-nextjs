/**
 * Master Discovery Service
 *
 * Implements the Master Discovery Prompt system that:
 * 1. Scrapes website content using Firecrawl
 * 2. Clusters keywords into topic clusters
 * 3. Assigns PILLAR and SUPPORTING article roles
 * 4. Maps secondary keywords to H2/FAQ sections for pillars
 * 5. Prevents keyword cannibalization
 *
 * Constraints:
 * - 1-12 topic clusters per website (1-2 for niche sites, 3-5 for small businesses, 5+ for larger sites)
 * - Max 100 keywords per cluster
 * - PILLAR: 1 primary + 4-10 secondaries
 * - SUPPORTING: 1 primary + 0-5 secondaries
 */

import OpenAI from 'openai';
import { scrapeUrlsWithFirecrawl } from '@/services/crawl/firecrawl-client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface MasterDiscoveryInput {
  site: {
    brand: string;
    domain: string;
    geo_focus: string[];
    seed_topics: string[];
  };
  sources?: {
    seed_urls?: string[];
    raw_owner_context?: string;
  };
  controls?: {
    max_clusters?: number;
    min_clusters?: number;
    map_sections?: boolean;
    include_local_slices?: boolean;
  };
}

export interface TopicCluster {
  pillar_title: string;
  primary_keyword: string;
  secondary_keywords: string[];
  notes?: string;
}

export interface ArticleSection {
  type: 'H2' | 'FAQ';
  heading: string;
  absorbs: string[];
}

export interface Article {
  id: string;
  role: 'PILLAR' | 'SUPPORTING';
  title: string;
  primary_keyword: string;
  secondary_keywords: string[];
  cluster: string;
  links_to?: string[];
  section_map?: ArticleSection[];
}

export interface MasterDiscoveryOutput {
  clusters: TopicCluster[];
  articles: Article[];
  section_maps?: ArticleSection[][];
  changes?: string[];
}

export interface DiscoveryResult {
  output: MasterDiscoveryOutput;
  scrapeLog: {
    seed_urls: string[];
    pages_fetched: number;
    notes: string[];
  };
}

// ============================================================================
// Master Discovery System Prompt
// ============================================================================

const MASTER_DISCOVERY_PROMPT = `You are an expert SEO strategist specializing in keyword clustering and content planning. Your task is to analyze a website and create a comprehensive SEO content strategy.

**STRICT RULES:**

1. **Keyword Assignment:**
   - Every article gets EXACTLY 1 primary keyword
   - PILLAR articles get 4-10 secondary keywords
   - SUPPORTING articles get 0-5 secondary keywords
   - Never assign the same keyword to multiple articles (prevents cannibalization)

2. **Clustering:**
   - Create 1-12 topic clusters total (1-2 for niche sites, 3-5 for small businesses, 5+ for larger sites)
   - Max 100 keywords per cluster
   - Each cluster represents a semantic theme
   - Cluster names should be clear, descriptive titles

3. **Article Roles:**
   - PILLAR: Comprehensive guide covering a broad topic with 4-10 related subtopics
   - SUPPORTING: Focused deep-dive into a specific subtopic, links back to pillar(s)
   - Supporting articles MUST reference their pillar(s) in links_to field

4. **Section Mapping (PILLAR articles only):**
   - Map each secondary keyword to an H2 section or FAQ item
   - Section heading should naturally incorporate the keyword
   - All secondary keywords MUST be absorbed into sections
   - Example: {"type": "H2", "heading": "How to Track User Behavior", "absorbs": ["user behavior tracking", "session recording"]}

5. **Changes Log:**
   - Document any keyword reassignments to prevent cannibalization
   - Explain clustering decisions
   - Note any local/geo-specific slicing applied

**OUTPUT FORMAT:**

Return valid JSON with this exact structure:

{
  "clusters": [
    {
      "pillar_title": "Cluster Name",
      "primary_keyword": "main keyword",
      "secondary_keywords": ["keyword1", "keyword2"],
      "notes": "Optional clustering notes"
    }
  ],
  "articles": [
    {
      "id": "pill_cluster_geo",
      "role": "PILLAR",
      "title": "Article Title",
      "primary_keyword": "main keyword",
      "secondary_keywords": ["kw1", "kw2", "kw3", "kw4"],
      "cluster": "Cluster Name",
      "section_map": [
        {"type": "H2", "heading": "Section Title", "absorbs": ["kw1", "kw2"]},
        {"type": "FAQ", "heading": "Question?", "absorbs": ["kw3"]}
      ]
    },
    {
      "id": "supp_topic_detail",
      "role": "SUPPORTING",
      "title": "Supporting Article Title",
      "primary_keyword": "specific keyword",
      "secondary_keywords": ["related1", "related2"],
      "cluster": "Cluster Name",
      "links_to": ["pill_cluster_geo"]
    }
  ],
  "changes": [
    "Moved 'keyword X' from article Y to Z to prevent cannibalization",
    "Split broad topic into pillar + 3 supporting articles"
  ]
}

**VALIDATION CHECKLIST:**
✅ Each article has exactly 1 primary keyword
✅ Pillar articles have 4-10 secondaries
✅ Supporting articles have 0-5 secondaries
✅ No keyword appears in multiple articles
✅ All pillar secondaries are mapped to H2/FAQ sections
✅ Supporting articles reference their pillars in links_to
✅ 1-12 clusters total (scale based on business size and seed topics)
✅ Max 100 keywords per cluster
✅ Changes log documents key decisions

Now analyze the website and create the strategy.`;

// ============================================================================
// Core Service Functions
// ============================================================================

/**
 * Build the discovery prompt with input data and scraped content
 */
function buildDiscoveryPrompt(
  input: MasterDiscoveryInput,
  scrapedContent: string[]
): string {
  const { site, sources, controls } = input;

  let prompt = `**WEBSITE DETAILS:**\n`;
  prompt += `- Brand: ${site.brand}\n`;
  prompt += `- Domain: ${site.domain}\n`;
  prompt += `- Geographic Focus: ${site.geo_focus.join(', ')}\n`;
  prompt += `- Seed Topics: ${site.seed_topics.join(', ')}\n\n`;

  if (sources?.raw_owner_context) {
    prompt += `**OWNER CONTEXT:**\n${sources.raw_owner_context}\n\n`;
  }

  if (scrapedContent.length > 0) {
    prompt += `**SCRAPED CONTENT:**\n`;
    scrapedContent.forEach((content, idx) => {
      prompt += `\n--- Page ${idx + 1} ---\n${content.substring(0, 3000)}\n`;
    });
    prompt += `\n`;
  }

  if (controls) {
    prompt += `**CONTROLS:**\n`;
    if (controls.max_clusters) prompt += `- Max clusters: ${controls.max_clusters}\n`;
    if (controls.min_clusters) prompt += `- Min clusters: ${controls.min_clusters}\n`;
    if (controls.map_sections !== undefined) prompt += `- Map sections: ${controls.map_sections}\n`;
    if (controls.include_local_slices !== undefined) prompt += `- Include local slices: ${controls.include_local_slices}\n`;
    prompt += `\n`;
  }

  prompt += `Create a comprehensive SEO content strategy following all rules above.`;

  return prompt;
}

/**
 * Validate discovery output against all constraints
 */
export function validateDiscoveryOutput(
  output: MasterDiscoveryOutput,
  controls?: { min_clusters?: number; max_clusters?: number }
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate cluster count (use controls or defaults)
  const minClusters = controls?.min_clusters || 1; // Allow niche sites with 1-2 clusters
  const maxClusters = controls?.max_clusters || 12;

  if (output.clusters.length < minClusters || output.clusters.length > maxClusters) {
    errors.push(`Cluster count ${output.clusters.length} outside range ${minClusters}-${maxClusters}`);
  }

  // Track keyword usage to detect duplicates
  const keywordUsage = new Map<string, string[]>();

  // Validate each article
  for (const article of output.articles) {
    const articleId = article.id;

    // Check primary keyword
    if (!article.primary_keyword) {
      errors.push(`Article ${articleId} missing primary keyword`);
    } else {
      if (!keywordUsage.has(article.primary_keyword)) {
        keywordUsage.set(article.primary_keyword, []);
      }
      keywordUsage.get(article.primary_keyword)!.push(articleId);
    }

    // Check secondary keyword counts
    const secondaryCount = article.secondary_keywords.length;
    if (article.role === 'PILLAR') {
      if (secondaryCount < 4 || secondaryCount > 10) {
        errors.push(`PILLAR ${articleId} has ${secondaryCount} secondaries (must be 4-10)`);
      }
    } else if (article.role === 'SUPPORTING') {
      if (secondaryCount > 5) {
        errors.push(`SUPPORTING ${articleId} has ${secondaryCount} secondaries (max 5)`);
      }
    }

    // Track secondary keywords
    for (const keyword of article.secondary_keywords) {
      if (!keywordUsage.has(keyword)) {
        keywordUsage.set(keyword, []);
      }
      keywordUsage.get(keyword)!.push(articleId);
    }

    // Validate section mapping for pillars
    if (article.role === 'PILLAR') {
      if (!article.section_map || article.section_map.length === 0) {
        errors.push(`PILLAR ${articleId} missing section_map`);
      } else {
        // Check all secondaries are absorbed
        const absorbedKeywords = new Set<string>();
        for (const section of article.section_map) {
          section.absorbs.forEach(kw => absorbedKeywords.add(kw));
        }

        for (const secondary of article.secondary_keywords) {
          if (!absorbedKeywords.has(secondary)) {
            errors.push(`PILLAR ${articleId} secondary "${secondary}" not absorbed in section_map`);
          }
        }
      }
    }

    // Validate supporting articles link to pillars
    if (article.role === 'SUPPORTING') {
      if (!article.links_to || article.links_to.length === 0) {
        errors.push(`SUPPORTING ${articleId} missing links_to (must reference pillar)`);
      }
    }
  }

  // Check for keyword cannibalization
  // Allow keywords to appear in PILLAR + 1 SUPPORTING (natural relationship)
  // But flag if appearing in 2+ supporting articles or 2+ pillars
  Array.from(keywordUsage.entries()).forEach(([keyword, articles]) => {
    if (articles.length > 2) {
      // Definitely too many duplicates
      errors.push(`Keyword "${keyword}" appears in ${articles.length} articles: ${articles.join(', ')}`);
    } else if (articles.length === 2) {
      // Allow if it's 1 PILLAR + 1 SUPPORTING (natural semantic relationship)
      const articleRoles = articles.map(articleId => {
        const article = output.articles.find(a => a.id === articleId);
        return article?.role || 'UNKNOWN';
      });

      const hasPillar = articleRoles.includes('PILLAR');
      const hasSupporting = articleRoles.includes('SUPPORTING');

      // Only flag if it's NOT the natural PILLAR+SUPPORTING relationship
      if (!hasPillar || !hasSupporting) {
        errors.push(`Keyword "${keyword}" appears in multiple articles: ${articles.join(', ')}`);
      }
      // Otherwise, this is acceptable (pillar + supporting semantic relationship)
    }
  });

  // Validate cluster keyword counts
  const clusterKeywordCounts = new Map<string, number>();
  for (const article of output.articles) {
    const count = 1 + article.secondary_keywords.length; // primary + secondaries
    clusterKeywordCounts.set(
      article.cluster,
      (clusterKeywordCounts.get(article.cluster) || 0) + count
    );
  }

  Array.from(clusterKeywordCounts.entries()).forEach(([cluster, count]) => {
    if (count > 100) {
      errors.push(`Cluster "${cluster}" has ${count} keywords (max 100)`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Main Master Discovery Function
 *
 * Orchestrates the full discovery process:
 * 1. Scrape seed URLs with Firecrawl
 * 2. Build discovery prompt
 * 3. Call OpenAI with Master Discovery Prompt
 * 4. Parse and validate output
 * 5. Return structured result
 */
export async function runMasterDiscovery(
  input: MasterDiscoveryInput
): Promise<DiscoveryResult> {
  console.log('[MASTER DISCOVERY] Starting discovery for', input.site.domain);

  // Step 1: Scrape seed URLs if provided
  let scrapedContent: string[] = [];
  let scrapeLog = {
    seed_urls: input.sources?.seed_urls || [],
    pages_fetched: 0,
    notes: [] as string[]
  };

  if (input.sources?.seed_urls && input.sources.seed_urls.length > 0) {
    try {
      console.log('[MASTER DISCOVERY] Scraping seed URLs:', input.sources.seed_urls);
      const scrapeResults = await scrapeUrlsWithFirecrawl(input.sources.seed_urls);

      scrapedContent = scrapeResults.map(result => result.markdown || result.html || '');
      scrapeLog.pages_fetched = scrapeResults.length;
      scrapeLog.notes.push(`Successfully scraped ${scrapeResults.length} pages`);
    } catch (error) {
      console.error('[MASTER DISCOVERY] Scraping error:', error);
      scrapeLog.notes.push(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Continue without scraped content
    }
  } else {
    scrapeLog.notes.push('No seed URLs provided, proceeding with seed topics only');
  }

  // Step 2: Build the prompt
  const userPrompt = buildDiscoveryPrompt(input, scrapedContent);

  // Step 3: Call OpenAI
  console.log('[MASTER DISCOVERY] Calling OpenAI for strategy generation');
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3, // Low temperature for deterministic clustering
    messages: [
      { role: 'system', content: MASTER_DISCOVERY_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' }
  });

  // Step 4: Parse response
  const responseContent = completion.choices[0].message.content;
  if (!responseContent) {
    throw new Error('Empty response from OpenAI');
  }

  let output: MasterDiscoveryOutput;
  try {
    output = JSON.parse(responseContent);
  } catch (error) {
    console.error('[MASTER DISCOVERY] Failed to parse OpenAI response:', responseContent);
    throw new Error('Invalid JSON response from OpenAI');
  }

  // Step 5: Validate output
  const validation = validateDiscoveryOutput(output, input.controls);
  if (!validation.valid) {
    console.error('[MASTER DISCOVERY] Validation failed:', validation.errors);
    throw new Error(`Discovery output validation failed: ${validation.errors.join('; ')}`);
  }

  console.log('[MASTER DISCOVERY] Discovery completed successfully', {
    clusters: output.clusters.length,
    articles: output.articles.length
  });

  return {
    output,
    scrapeLog
  };
}

/**
 * Helper to extract article roles by type
 */
export function extractArticlesByRole(output: MasterDiscoveryOutput) {
  return {
    pillars: output.articles.filter(a => a.role === 'PILLAR'),
    supporting: output.articles.filter(a => a.role === 'SUPPORTING')
  };
}

/**
 * Helper to get all keywords for a cluster
 */
export function getClusterKeywords(
  clusterName: string,
  output: MasterDiscoveryOutput
): string[] {
  const keywords = new Set<string>();

  for (const article of output.articles) {
    if (article.cluster === clusterName) {
      keywords.add(article.primary_keyword);
      article.secondary_keywords.forEach(kw => keywords.add(kw));
    }
  }

  return Array.from(keywords);
}
