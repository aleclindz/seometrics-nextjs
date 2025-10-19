/**
 * Link Injector Service
 * 
 * Resolves link plans to actual URLs and injects hyperlinks into article HTML.
 * Called during article publishing when URLs are confirmed.
 * 
 * Features:
 * - Resolves target article URLs from briefs/queue
 * - Finds appropriate insertion points in HTML
 * - Injects links naturally throughout content
 * - Avoids headers, first paragraph, and clustered links
 * - Gracefully skips unpublished target articles
 */

import { createClient } from '@supabase/supabase-js';
import type { InternalLinkPlan, RecommendedLink } from './internal-link-planner';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// Types
// ============================================================================

export interface ResolvedLink {
  target_url: string;
  anchor_text: string;
  link_type: string;
  target_brief_id: number | null;
}

export interface InjectedLink extends ResolvedLink {
  inserted_at: string;
  position_index: number;
}

export interface LinkInjectionResult {
  updatedContent: string;
  insertedLinks: InjectedLink[];
  skippedLinks: number;
}

// ============================================================================
// Main Class
// ============================================================================

export class LinkInjector {
  /**
   * Inject internal links into article content
   */
  async injectInternalLinks(
    articleId: number,
    htmlContent: string,
    linkPlan: InternalLinkPlan,
    websiteToken: string
  ): Promise<LinkInjectionResult> {
    console.log('[LINK INJECTOR] Injecting links for article', articleId);

    if (!linkPlan || !linkPlan.recommended_links || linkPlan.recommended_links.length === 0) {
      console.log('[LINK INJECTOR] No links in plan');
      return {
        updatedContent: htmlContent,
        insertedLinks: [],
        skippedLinks: 0
      };
    }

    // Resolve URLs for all links in the plan
    const resolvedLinks = await this.resolveLinkUrls(linkPlan, websiteToken);

    if (resolvedLinks.length === 0) {
      console.log('[LINK INJECTOR] No links could be resolved (target articles may not be published yet)');
      return {
        updatedContent: htmlContent,
        insertedLinks: [],
        skippedLinks: linkPlan.recommended_links.length
      };
    }

    console.log('[LINK INJECTOR] Resolved', resolvedLinks.length, 'of', linkPlan.recommended_links.length, 'links');

    // Inject links into content
    let updatedContent = htmlContent;
    const insertedLinks: InjectedLink[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < resolvedLinks.length; i++) {
      const link = resolvedLinks[i];
      
      // Find insertion point for this link
      const insertionResult = this.findAndInsertLink(
        updatedContent,
        link.anchor_text,
        link.target_url
      );

      if (insertionResult.success) {
        updatedContent = insertionResult.content;
        insertedLinks.push({
          ...link,
          inserted_at: now,
          position_index: i
        });
        console.log('[LINK INJECTOR] Inserted link:', link.anchor_text, '→', link.target_url);
      } else {
        console.log('[LINK INJECTOR] Could not find insertion point for:', link.anchor_text);
      }
    }

    const skippedLinks = linkPlan.recommended_links.length - insertedLinks.length;

    return {
      updatedContent,
      insertedLinks,
      skippedLinks
    };
  }

  /**
   * Resolve link plan to actual URLs
   */
  async resolveLinkUrls(
    linkPlan: InternalLinkPlan,
    websiteToken: string
  ): Promise<ResolvedLink[]> {
    const resolvedLinks: ResolvedLink[] = [];

    for (const link of linkPlan.recommended_links) {
      // Try to find published article by brief_id or discovery_article_id
      const targetUrl = await this.findPublishedArticleUrl(
        link.target_brief_id,
        link.target_discovery_article_id,
        websiteToken
      );

      if (targetUrl) {
        resolvedLinks.push({
          target_url: targetUrl,
          anchor_text: link.anchor_hint,
          link_type: link.link_type,
          target_brief_id: link.target_brief_id
        });
      }
    }

    return resolvedLinks;
  }

  /**
   * Find published article URL by brief_id or discovery_article_id
   */
  private async findPublishedArticleUrl(
    briefId: number | null,
    discoveryArticleId: string | null,
    websiteToken: string
  ): Promise<string | null> {
    // First, get website_id from website_token
    const { data: website } = await supabase
      .from('websites')
      .select('id')
      .eq('website_token', websiteToken)
      .maybeSingle();

    if (!website) {
      return null;
    }

    const websiteId = website.id;

    // Try article_queue first (generated articles) by brief_id
    if (briefId) {
      const { data: queueArticle } = await supabase
        .from('article_queue')
        .select('public_url, slug')
        .eq('generated_from_brief_id', briefId)
        .eq('website_id', websiteId)
        .in('status', ['published', 'generated'])
        .maybeSingle();

      if (queueArticle?.public_url) {
        return queueArticle.public_url;
      }

      if (queueArticle?.slug) {
        return `/${queueArticle.slug}`;
      }
    }

    // Try by discovery_article_id
    if (discoveryArticleId) {
      const { data: queueArticle } = await supabase
        .from('article_queue')
        .select('public_url, slug')
        .eq('discovery_article_id', discoveryArticleId)
        .eq('website_id', websiteId)
        .in('status', ['published', 'generated'])
        .maybeSingle();

      if (queueArticle?.public_url) {
        return queueArticle.public_url;
      }

      if (queueArticle?.slug) {
        return `/${queueArticle.slug}`;
      }
    }

    // Try article_briefs for url_path as fallback
    if (briefId) {
      const { data: brief } = await supabase
        .from('article_briefs')
        .select('url_path')
        .eq('id', briefId)
        .maybeSingle();

      if (brief?.url_path) {
        return brief.url_path;
      }
    }

    return null;
  }

  /**
   * Find appropriate location and insert link
   */
  private findAndInsertLink(
    htmlContent: string,
    anchorText: string,
    targetUrl: string
  ): { success: boolean; content: string } {
    // Strategy: Find the anchor text in the HTML and replace first occurrence
    // that's not in a heading or the first paragraph
    
    // Simple approach: Find the anchor text and wrap it in an <a> tag
    // We'll look for it in paragraph tags specifically to avoid headers
    
    const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gis;
    let matches = [...htmlContent.matchAll(paragraphRegex)];
    
    // Skip first paragraph (introduction should not have immediate links)
    matches = matches.slice(1);

    // Find a paragraph that contains the anchor text (case insensitive)
    for (const match of matches) {
      const paragraphContent = match[1];
      const fullParagraph = match[0];
      
      // Check if this paragraph already has links (avoid clustering)
      if (fullParagraph.includes('<a ')) {
        continue;
      }

      // Check if anchor text appears in this paragraph
      const anchorRegex = new RegExp(`\\b${this.escapeRegex(anchorText)}\\b`, 'i');
      
      if (anchorRegex.test(paragraphContent)) {
        // Replace the first occurrence with a link
        const linkedContent = paragraphContent.replace(
          anchorRegex,
          `<a href="${targetUrl}">${anchorText}</a>`
        );
        
        const linkedParagraph = fullParagraph.replace(paragraphContent, linkedContent);
        const updatedContent = htmlContent.replace(fullParagraph, linkedParagraph);
        
        return {
          success: true,
          content: updatedContent
        };
      }
    }

    // Fallback: Try to find anchor text anywhere in content (excluding headings)
    const nonHeadingRegex = new RegExp(
      `(?<!<h[1-6][^>]*>[^<]*)\\b(${this.escapeRegex(anchorText)})\\b(?![^<]*<\/h[1-6]>)`,
      'i'
    );

    if (nonHeadingRegex.test(htmlContent)) {
      const updatedContent = htmlContent.replace(
        nonHeadingRegex,
        `<a href="${targetUrl}">$1</a>`
      );
      
      return {
        success: true,
        content: updatedContent
      };
    }

    // Could not find a suitable location
    return {
      success: false,
      content: htmlContent
    };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Find all potential insertion points for a link
   * Returns character positions in the HTML
   */
  findInsertionPoints(htmlContent: string, anchorText: string): number[] {
    const positions: number[] = [];
    const regex = new RegExp(this.escapeRegex(anchorText), 'gi');
    let match;

    while ((match = regex.exec(htmlContent)) !== null) {
      positions.push(match.index);
    }

    return positions;
  }
}

