/**
 * Research Service
 * 
 * Handles research-first drafting with verifiable sources using:
 * - OpenAlex (academic sources)
 * - Crossref (research papers/reports) 
 * - Wikipedia REST (topic briefs)
 * - SerpAPI/Brave Search (optional, for recent web sources)
 */

export type ResearchSource = {
  title: string;
  url: string;
  source?: string;
  published?: string;
};

export type ResearchResult = {
  sources: ResearchSource[];
  brief: string;
};

export class ResearchService {
  constructor() {}

  /**
   * Perform research using multiple sources
   */
  async performResearch(params: {
    title: string;
    keywords: string[];
    maxResults?: number;
  }): Promise<ResearchResult> {
    const { title, keywords, maxResults = 6 } = params;
    const queries = [title, ...keywords].filter(Boolean).slice(0, 3);
    const results: ResearchSource[] = [];

    // OpenAlex (academic sources - no API key required)
    await this.searchOpenAlex(queries, results, maxResults);

    // Crossref (research papers - no API key required)
    await this.searchCrossref(queries, results, maxResults);

    // Wikipedia REST (no API key required)
    await this.searchWikipedia(queries, results, maxResults);

    // SerpAPI (optional - requires API key)
    if (process.env.SERPAPI_KEY) {
      await this.searchSerpAPI(queries, results, maxResults);
    }

    // Brave Search API (optional - requires API key)
    if (process.env.BRAVE_SEARCH_API_KEY) {
      await this.searchBrave(queries, results, maxResults);
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const sources = results.filter(r => {
      if (!r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    }).slice(0, maxResults);

    const brief = sources
      .map((s, i) => `[${i + 1}] ${s.title} — ${s.source || ''} — ${s.url}`)
      .join('\n');

    return { sources, brief };
  }

  /**
   * Search OpenAlex for academic sources
   */
  private async searchOpenAlex(
    queries: string[], 
    results: ResearchSource[], 
    maxResults: number
  ): Promise<void> {
    try {
      for (const query of queries) {
        if (results.length >= maxResults) break;
        
        const response = await fetch(
          `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=3`,
          { signal: AbortSignal.timeout(8000) }
        );

        if (response.ok) {
          const data = await response.json();
          for (const work of (data?.results || [])) {
            if (results.length >= maxResults) break;
            
            results.push({
              title: work.title,
              url: work?.doi 
                ? `https://doi.org/${work.doi.replace('https://doi.org/', '')}` 
                : (work?.primary_location?.source?.homepage_url || ''),
              source: (
                work?.host_venue?.display_name || 
                work?.primary_location?.source?.display_name || 
                'OpenAlex'
              ),
              published: work?.publication_year ? String(work.publication_year) : undefined
            });
          }
        }
      }
    } catch (error) {
      console.log('[RESEARCH] OpenAlex search failed:', error);
    }
  }

  /**
   * Search Crossref for research papers and reports
   */
  private async searchCrossref(
    queries: string[], 
    results: ResearchSource[], 
    maxResults: number
  ): Promise<void> {
    try {
      for (const query of queries) {
        if (results.length >= maxResults) break;
        
        const response = await fetch(
          `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=3`,
          { signal: AbortSignal.timeout(8000) }
        );

        if (response.ok) {
          const data = await response.json();
          for (const item of (data?.message?.items || [])) {
            if (results.length >= maxResults) break;
            
            const doi = item.DOI ? `https://doi.org/${item.DOI}` : undefined;
            results.push({
              title: item.title?.[0] || 'Untitled',
              url: doi || (item.URL || ''),
              source: item['container-title']?.[0],
              published: item.created?.['date-time'] || 
                         item.issued?.['date-parts']?.[0]?.join('-')
            });
          }
        }
      }
    } catch (error) {
      console.log('[RESEARCH] Crossref search failed:', error);
    }
  }

  /**
   * Search Wikipedia for topic briefs
   */
  private async searchWikipedia(
    queries: string[], 
    results: ResearchSource[], 
    maxResults: number
  ): Promise<void> {
    try {
      for (const query of queries) {
        if (results.length >= maxResults) break;
        
        const response = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
          { signal: AbortSignal.timeout(6000) }
        );

        if (response.ok) {
          const data = await response.json();
          if (data?.content_urls?.desktop?.page) {
            results.push({
              title: data.title,
              url: data.content_urls.desktop.page,
              source: 'Wikipedia',
              published: undefined
            });
          }
        }
      }
    } catch (error) {
      console.log('[RESEARCH] Wikipedia search failed:', error);
    }
  }

  /**
   * Search SerpAPI for recent web sources
   */
  private async searchSerpAPI(
    queries: string[], 
    results: ResearchSource[], 
    maxResults: number
  ): Promise<void> {
    try {
      const query = queries[0] || '';
      const response = await fetch(
        `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=5&api_key=${process.env.SERPAPI_KEY}`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (response.ok) {
        const data = await response.json();
        for (const result of (data?.organic_results || [])) {
          if (results.length >= maxResults) break;
          
          results.push({
            title: result.title,
            url: result.link,
            source: result.source,
            published: result.date
          });
        }
      }
    } catch (error) {
      console.log('[RESEARCH] SerpAPI search failed:', error);
    }
  }

  /**
   * Search Brave Search API for web sources
   */
  private async searchBrave(
    queries: string[], 
    results: ResearchSource[], 
    maxResults: number
  ): Promise<void> {
    try {
      const query = queries[0] || '';
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
        {
          headers: {
            'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY!
          },
          signal: AbortSignal.timeout(8000)
        }
      );

      if (response.ok) {
        const data = await response.json();
        for (const result of (data?.web?.results || [])) {
          if (results.length >= maxResults) break;
          
          results.push({
            title: result.title,
            url: result.url,
            source: result.profile?.name || 'Web',
            published: result.age
          });
        }
      }
    } catch (error) {
      console.log('[RESEARCH] Brave Search failed:', error);
    }
  }
}