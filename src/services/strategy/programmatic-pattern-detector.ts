/**
 * Programmatic SEO Pattern Detector
 *
 * Analyzes user messages to automatically detect programmatic SEO patterns
 * and extract term lists for bulk brief generation.
 *
 * Patterns detected:
 * - Location-based: "[service] in [city1], [city2], [city3]"
 * - Product variations: "[brand1], [brand2], [brand3] [product] review"
 * - Category combinations: "[adjective] [noun]" patterns
 * - Comparison patterns: "[A] vs [B]", "compare [A] and [B]"
 */

export type ProgrammaticPattern = 'location' | 'product' | 'category' | 'comparison' | 'custom';

export interface DetectedPattern {
  pattern_type: ProgrammaticPattern;
  confidence: number; // 0-1
  template: string; // e.g., "best {service} in {city}"
  term_lists: Record<string, string[]>; // e.g., {service: ['plumbers'], city: ['Miami', 'Tampa']}
  explanation: string;
  estimated_briefs: number;
}

export interface PatternDetectionResult {
  detected: boolean;
  patterns: DetectedPattern[];
  user_intent: string;
}

/**
 * Detect programmatic SEO patterns in user message
 */
export function detectProgrammaticPatterns(userMessage: string, domain?: string): PatternDetectionResult {
  const message = userMessage.toLowerCase();
  const patterns: DetectedPattern[] = [];

  // 1. Location-based pattern detection
  const locationPattern = detectLocationPattern(userMessage, message);
  if (locationPattern) {
    patterns.push(locationPattern);
  }

  // 2. Product/Brand variation pattern
  const productPattern = detectProductPattern(userMessage, message);
  if (productPattern) {
    patterns.push(productPattern);
  }

  // 3. Comparison pattern
  const comparisonPattern = detectComparisonPattern(userMessage, message);
  if (comparisonPattern) {
    patterns.push(comparisonPattern);
  }

  // 4. Category combination pattern
  const categoryPattern = detectCategoryPattern(userMessage, message);
  if (categoryPattern) {
    patterns.push(categoryPattern);
  }

  // Determine user intent
  const user_intent = patterns.length > 0
    ? `Generate programmatic content using ${patterns[0].pattern_type} pattern`
    : 'Unknown';

  return {
    detected: patterns.length > 0,
    patterns: patterns.sort((a, b) => b.confidence - a.confidence),
    user_intent
  };
}

/**
 * Detect location-based patterns
 * Examples:
 * - "best plumbers in Miami, Tampa, Orlando"
 * - "generate briefs for Miami, Tampa, Orlando"
 * - "[service] in [city list]"
 */
function detectLocationPattern(original: string, lower: string): DetectedPattern | null {
  // Common location keywords
  const locationKeywords = ['in', 'near', 'around', 'for'];
  const locationIndicators = ['city', 'cities', 'location', 'locations', 'area', 'areas', 'region', 'regions'];

  // Pattern 1: Explicit city list with commas
  // "Miami, Tampa, Orlando" or "Miami, Tampa, and Orlando"
  const cityListMatch = lower.match(/(?:in|near|for|cities?|locations?:?)\s+([a-z\s,]+(?:and\s+)?[a-z\s]+)/i);

  if (cityListMatch) {
    const citiesStr = cityListMatch[1];
    const cities = citiesStr
      .split(/,|\band\b/)
      .map(c => c.trim())
      .filter(c => c.length > 2 && c.length < 30)
      .map(c => capitalizeWords(c));

    if (cities.length >= 2) {
      // Try to extract the service/topic
      let service = 'services';

      // Look for keywords before "in/for/near"
      const beforeMatch = original.match(/([\w\s]+)\s+(?:in|for|near)\s+/i);
      if (beforeMatch) {
        service = beforeMatch[1].trim();
      }

      // Check for "briefs for X" pattern
      const briefsMatch = original.match(/briefs?\s+for\s+([\w\s]+)\s+in/i);
      if (briefsMatch) {
        service = briefsMatch[1].trim();
      }

      const template = `best {service} in {city}`;

      return {
        pattern_type: 'location',
        confidence: 0.9,
        template,
        term_lists: {
          service: [service],
          city: cities
        },
        explanation: `Detected ${cities.length} cities for location-based content`,
        estimated_briefs: cities.length
      };
    }
  }

  // Pattern 2: Explicit mention of programmatic location intent
  if (lower.includes('location') || lower.includes('cities')) {
    // Try to extract list
    const items = extractCommaSeparatedList(original);
    if (items.length >= 2) {
      return {
        pattern_type: 'location',
        confidence: 0.8,
        template: 'best {service} in {location}',
        term_lists: {
          service: ['services'],
          location: items.map(capitalizeWords)
        },
        explanation: `Detected ${items.length} locations from list`,
        estimated_briefs: items.length
      };
    }
  }

  return null;
}

/**
 * Detect product/brand variation patterns
 * Examples:
 * - "create reviews for Apple, Samsung, Google"
 * - "generate briefs for iPhone, Galaxy, Pixel"
 * - "[brand1], [brand2], [brand3] [product]"
 */
function detectProductPattern(original: string, lower: string): DetectedPattern | null {
  const productKeywords = ['product', 'products', 'brand', 'brands', 'manufacturer', 'manufacturers', 'model', 'models'];
  const actionKeywords = ['review', 'reviews', 'guide', 'comparison'];

  // Check if message mentions products/brands
  const hasProductContext = productKeywords.some(kw => lower.includes(kw)) ||
                           actionKeywords.some(kw => lower.includes(kw));

  if (hasProductContext) {
    const items = extractCommaSeparatedList(original);

    if (items.length >= 2) {
      // Determine if it's a review, guide, or general content
      let contentType = 'guide';
      if (lower.includes('review')) contentType = 'review';
      if (lower.includes('comparison') || lower.includes('vs')) contentType = 'comparison';

      return {
        pattern_type: 'product',
        confidence: 0.85,
        template: `{product} {contentType}`,
        term_lists: {
          product: items.map(capitalizeWords),
          contentType: [contentType]
        },
        explanation: `Detected ${items.length} products/brands for variation content`,
        estimated_briefs: items.length
      };
    }
  }

  return null;
}

/**
 * Detect comparison patterns
 * Examples:
 * - "compare Shopify, WooCommerce, BigCommerce"
 * - "X vs Y for A, B, C"
 * - "generate comparisons for [list]"
 */
function detectComparisonPattern(original: string, lower: string): DetectedPattern | null {
  const comparisonKeywords = ['vs', 'versus', 'compare', 'comparison', 'comparisons', 'difference between'];

  const hasComparison = comparisonKeywords.some(kw => lower.includes(kw));

  if (hasComparison) {
    const items = extractCommaSeparatedList(original);

    if (items.length >= 2) {
      // Generate pairwise comparisons
      const pairs: Array<[string, string]> = [];
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          pairs.push([items[i], items[j]]);
        }
      }

      return {
        pattern_type: 'comparison',
        confidence: 0.9,
        template: '{item_a} vs {item_b}',
        term_lists: {
          // Store pairs as combined terms for generation
          item_pairs: pairs.map(p => `${p[0]}|${p[1]}`)
        },
        explanation: `Detected ${items.length} items for ${pairs.length} pairwise comparisons`,
        estimated_briefs: pairs.length
      };
    }
  }

  return null;
}

/**
 * Detect category combination patterns
 * Examples:
 * - "leather, canvas, nylon bags"
 * - "[material] [product]" patterns
 */
function detectCategoryPattern(original: string, lower: string): DetectedPattern | null {
  // This is harder to detect automatically
  // Look for adjective + noun patterns with lists
  const items = extractCommaSeparatedList(original);

  // Only trigger if we have 3+ items and no other pattern matched
  if (items.length >= 3) {
    // Check if items look like modifiers (adjectives)
    const seemsLikeModifiers = items.every(item => {
      const words = item.split(/\s+/);
      return words.length <= 2; // Simple modifier check
    });

    if (seemsLikeModifiers) {
      // Try to extract the base noun
      let baseNoun = 'products';
      const nounMatch = original.match(/([a-z]+)(?:\s*[,.]|\s+and\s+)/i);
      if (nounMatch) {
        // Look for the last word mentioned after the list
        const afterList = original.substring(original.lastIndexOf(items[items.length - 1]));
        const nounAfter = afterList.match(/\s+([a-z]+)/i);
        if (nounAfter) {
          baseNoun = nounAfter[1];
        }
      }

      return {
        pattern_type: 'category',
        confidence: 0.7,
        template: '{modifier} {category}',
        term_lists: {
          modifier: items.map(capitalizeWords),
          category: [baseNoun]
        },
        explanation: `Detected ${items.length} category variations`,
        estimated_briefs: items.length
      };
    }
  }

  return null;
}

/**
 * Extract comma-separated list from text
 */
function extractCommaSeparatedList(text: string): string[] {
  // Look for patterns like "A, B, C" or "A, B and C" or "A, B, and C"
  const listMatch = text.match(/([a-zA-Z][a-zA-Z0-9\s]*(?:,\s*(?:and\s+)?[a-zA-Z][a-zA-Z0-9\s]*)+)/);

  if (listMatch) {
    return listMatch[1]
      .split(/,|\band\b/)
      .map(item => item.trim())
      .filter(item => item.length > 0 && item.length < 50);
  }

  return [];
}

/**
 * Capitalize first letter of each word
 */
function capitalizeWords(str: string): string {
  return str
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Extract explicit template from user message
 * Looks for patterns like: "use template: [template]" or "template: [template]"
 */
export function extractExplicitTemplate(userMessage: string): string | null {
  const templateMatch = userMessage.match(/template[:\s]+["']?([^"'\n]+)["']?/i);

  if (templateMatch) {
    return templateMatch[1].trim();
  }

  return null;
}

/**
 * Parse template and extract placeholder names
 * Example: "best {product} in {city}" → ['product', 'city']
 */
export function extractTemplatePlaceholders(template: string): string[] {
  const matches = template.match(/\{([^}]+)\}/g);

  if (matches) {
    return matches.map(m => m.replace(/[{}]/g, ''));
  }

  return [];
}

/**
 * Validate that term lists match template placeholders
 */
export function validateTemplateAndLists(template: string, termLists: Record<string, string[]>): {
  valid: boolean;
  errors: string[];
} {
  const placeholders = extractTemplatePlaceholders(template);
  const errors: string[] = [];

  if (placeholders.length === 0) {
    errors.push('Template must contain at least one placeholder like {city} or {product}');
  }

  for (const placeholder of placeholders) {
    if (!termLists[placeholder]) {
      errors.push(`Missing term list for placeholder: {${placeholder}}`);
    } else if (termLists[placeholder].length === 0) {
      errors.push(`Term list for {${placeholder}} is empty`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
