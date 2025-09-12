"use strict";
/**
 * Research Service
 *
 * Handles research-first drafting with verifiable sources using:
 * - OpenAlex (academic sources)
 * - Crossref (research papers/reports)
 * - Wikipedia REST (topic briefs)
 * - SerpAPI/Brave Search (optional, for recent web sources)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchService = void 0;
class ResearchService {
    constructor() { }
    /**
     * Perform research using multiple sources
     */
    async performResearch(params) {
        const { title, keywords, maxResults = 6 } = params;
        const queries = [title, ...keywords].filter(Boolean).slice(0, 3);
        const results = [];
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
        const seen = new Set();
        const sources = results.filter(r => {
            if (!r.url || seen.has(r.url))
                return false;
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
    async searchOpenAlex(queries, results, maxResults) {
        var _a, _b, _c, _d, _e;
        try {
            for (const query of queries) {
                if (results.length >= maxResults)
                    break;
                const response = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=3`, { signal: AbortSignal.timeout(8000) });
                if (response.ok) {
                    const data = await response.json();
                    for (const work of ((data === null || data === void 0 ? void 0 : data.results) || [])) {
                        if (results.length >= maxResults)
                            break;
                        results.push({
                            title: work.title,
                            url: (work === null || work === void 0 ? void 0 : work.doi)
                                ? `https://doi.org/${work.doi.replace('https://doi.org/', '')}`
                                : (((_b = (_a = work === null || work === void 0 ? void 0 : work.primary_location) === null || _a === void 0 ? void 0 : _a.source) === null || _b === void 0 ? void 0 : _b.homepage_url) || ''),
                            source: (((_c = work === null || work === void 0 ? void 0 : work.host_venue) === null || _c === void 0 ? void 0 : _c.display_name) ||
                                ((_e = (_d = work === null || work === void 0 ? void 0 : work.primary_location) === null || _d === void 0 ? void 0 : _d.source) === null || _e === void 0 ? void 0 : _e.display_name) ||
                                'OpenAlex'),
                            published: (work === null || work === void 0 ? void 0 : work.publication_year) ? String(work.publication_year) : undefined
                        });
                    }
                }
            }
        }
        catch (error) {
            console.log('[RESEARCH] OpenAlex search failed:', error);
        }
    }
    /**
     * Search Crossref for research papers and reports
     */
    async searchCrossref(queries, results, maxResults) {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            for (const query of queries) {
                if (results.length >= maxResults)
                    break;
                const response = await fetch(`https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=3`, { signal: AbortSignal.timeout(8000) });
                if (response.ok) {
                    const data = await response.json();
                    for (const item of (((_a = data === null || data === void 0 ? void 0 : data.message) === null || _a === void 0 ? void 0 : _a.items) || [])) {
                        if (results.length >= maxResults)
                            break;
                        const doi = item.DOI ? `https://doi.org/${item.DOI}` : undefined;
                        results.push({
                            title: ((_b = item.title) === null || _b === void 0 ? void 0 : _b[0]) || 'Untitled',
                            url: doi || (item.URL || ''),
                            source: (_c = item['container-title']) === null || _c === void 0 ? void 0 : _c[0],
                            published: ((_d = item.created) === null || _d === void 0 ? void 0 : _d['date-time']) ||
                                ((_g = (_f = (_e = item.issued) === null || _e === void 0 ? void 0 : _e['date-parts']) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.join('-'))
                        });
                    }
                }
            }
        }
        catch (error) {
            console.log('[RESEARCH] Crossref search failed:', error);
        }
    }
    /**
     * Search Wikipedia for topic briefs
     */
    async searchWikipedia(queries, results, maxResults) {
        var _a, _b;
        try {
            for (const query of queries) {
                if (results.length >= maxResults)
                    break;
                const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(6000) });
                if (response.ok) {
                    const data = await response.json();
                    if ((_b = (_a = data === null || data === void 0 ? void 0 : data.content_urls) === null || _a === void 0 ? void 0 : _a.desktop) === null || _b === void 0 ? void 0 : _b.page) {
                        results.push({
                            title: data.title,
                            url: data.content_urls.desktop.page,
                            source: 'Wikipedia',
                            published: undefined
                        });
                    }
                }
            }
        }
        catch (error) {
            console.log('[RESEARCH] Wikipedia search failed:', error);
        }
    }
    /**
     * Search SerpAPI for recent web sources
     */
    async searchSerpAPI(queries, results, maxResults) {
        try {
            const query = queries[0] || '';
            const response = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=5&api_key=${process.env.SERPAPI_KEY}`, { signal: AbortSignal.timeout(8000) });
            if (response.ok) {
                const data = await response.json();
                for (const result of ((data === null || data === void 0 ? void 0 : data.organic_results) || [])) {
                    if (results.length >= maxResults)
                        break;
                    results.push({
                        title: result.title,
                        url: result.link,
                        source: result.source,
                        published: result.date
                    });
                }
            }
        }
        catch (error) {
            console.log('[RESEARCH] SerpAPI search failed:', error);
        }
    }
    /**
     * Search Brave Search API for web sources
     */
    async searchBrave(queries, results, maxResults) {
        var _a, _b;
        try {
            const query = queries[0] || '';
            const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
                headers: {
                    'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY
                },
                signal: AbortSignal.timeout(8000)
            });
            if (response.ok) {
                const data = await response.json();
                for (const result of (((_a = data === null || data === void 0 ? void 0 : data.web) === null || _a === void 0 ? void 0 : _a.results) || [])) {
                    if (results.length >= maxResults)
                        break;
                    results.push({
                        title: result.title,
                        url: result.url,
                        source: ((_b = result.profile) === null || _b === void 0 ? void 0 : _b.name) || 'Web',
                        published: result.age
                    });
                }
            }
        }
        catch (error) {
            console.log('[RESEARCH] Brave Search failed:', error);
        }
    }
}
exports.ResearchService = ResearchService;
