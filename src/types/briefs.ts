export type SearchIntent = 'informational' | 'commercial' | 'transactional' | 'comparison' | 'pricing' | 'location' | 'mixed';

export interface InternalLinkSuggestion {
  anchor: string;
  target: string; // path or URL
  topic_cluster?: string | null;
  rationale?: string;
}

export interface ContentBrief {
  title: string;
  h1: string;
  url_path: string; // path only, no domain
  page_type: 'pillar' | 'cluster' | 'supporting';
  parent_cluster: string | null;
  primary_keyword: string;
  intent: SearchIntent;
  secondary_keywords: string[]; // 2-4 variants
  target_queries: string[]; // optional SERP-style queries
  summary: string; // 2–4 sentence author brief
  internal_links: {
    up_to_pillar?: InternalLinkSuggestion | null;
    same_cluster: InternalLinkSuggestion[];
    cross_cluster: InternalLinkSuggestion[];
  };
  cannibalization: {
    risk: 'none' | 'possible' | 'high';
    conflicts: Array<{
      url: string;
      title?: string | null;
      primary_keyword?: string | null;
      intent?: SearchIntent | null;
    }>;
    recommendation?: 'differentiate' | 'consolidate' | 'canonicalize' | null;
    canonical_to?: string | null;
  };
  metadata: {
    word_count_range: [number, number];
    tone: 'professional' | 'casual' | 'technical';
    notes: string[];
  };
}

export interface BriefsGenerationRequest {
  userToken: string;
  websiteToken?: string;
  domain?: string;
  count?: number;
  clusters?: string[]; // optional filter to specific clusters
  includePillar?: boolean; // if true, include/emit a pillar brief for each cluster
}

export interface BriefsGenerationResponse {
  success: boolean;
  briefs: ContentBrief[];
  summary: {
    total: number;
    by_intent: Record<string, number>;
    cannibalization: { none: number; possible: number; high: number };
  };
}

