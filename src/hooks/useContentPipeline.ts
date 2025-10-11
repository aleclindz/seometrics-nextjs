import { useState, useEffect, useCallback } from 'react';

export type ArticleStage = 'brief' | 'draft' | 'published';

export interface Keyword {
  term: string;
  vol?: number;
}

export interface ContentItem {
  id: string;
  cluster: string;
  stage: ArticleStage;
  title: string;
  brief?: string;
  keywords?: Keyword[];
  wordGoal?: number;
  createdAt?: string;
  scheduledDraftAt?: string | null;
  scheduledPublishAt?: string | null;
  url?: string;
  flags?: {
    autoGenerate?: boolean;
    autoPublish?: boolean;
  };
}

interface UseContentPipelineProps {
  userToken: string;
  websiteToken: string;
  domain: string;
}

export function useContentPipeline({ userToken, websiteToken, domain }: UseContentPipelineProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all content items (briefs, drafts, published)
  const fetchContent = useCallback(async () => {
    if (!userToken || !websiteToken) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch briefs
      const briefsResponse = await fetch(
        `/api/content/article-briefs-queue?userToken=${encodeURIComponent(userToken)}&websiteToken=${encodeURIComponent(websiteToken)}&domain=${encodeURIComponent(domain)}&limit=100`
      );
      const briefsData = await briefsResponse.json();

      // Fetch articles (drafts and published)
      const articlesResponse = await fetch(
        `/api/articles?userToken=${encodeURIComponent(userToken)}`
      );
      const articlesData = await articlesResponse.json();

      // Transform briefs to ContentItems
      const briefItems: ContentItem[] = (briefsData.queue || []).map((brief: any) => ({
        id: `brief-${brief.id}`,
        cluster: brief.topicCluster || 'Uncategorized',
        stage: 'brief' as ArticleStage,
        title: brief.title,
        brief: brief.title, // brief description
        keywords: brief.targetKeywords?.map((kw: string) => ({ term: kw })) || [],
        wordGoal: brief.wordCount || brief.articleFormat?.wordCountRange?.[1] || 0,
        createdAt: brief.scheduledFor || new Date().toISOString(),
        scheduledDraftAt: brief.scheduledFor || null,
        scheduledPublishAt: null,
        flags: {
          autoGenerate: false,
          autoPublish: false
        }
      }));

      // Filter articles for current domain
      const normalize = (d: string) => d
        .replace(/^sc-domain:/i, '')
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/$/, '');
      const domainClean = normalize(domain);

      const relevantArticles = (articlesData.articles || []).filter((a: any) => {
        const articleDomain = a.websites?.domain || '';
        return normalize(articleDomain) === domainClean;
      });

      // Transform articles to ContentItems
      const articleItems: ContentItem[] = relevantArticles.map((article: any) => {
        const isPublished = article.status === 'published' || article.published_at;
        const stage: ArticleStage = isPublished ? 'published' : 'draft';

        return {
          id: `article-${article.id}`,
          cluster: article.topic_cluster || 'Uncategorized',
          stage,
          title: article.title,
          brief: article.title,
          keywords: Array.isArray(article.target_keywords)
            ? article.target_keywords.map((kw: any) => ({
                term: typeof kw === 'string' ? kw : kw.term || kw.keyword,
                vol: typeof kw === 'object' ? kw.vol : undefined
              }))
            : [],
          wordGoal: article.word_count || 0,
          createdAt: article.created_at,
          scheduledDraftAt: null,
          scheduledPublishAt: article.scheduled_publish_at || article.published_at || null,
          url: isPublished ? (article.public_url || article.cms_admin_url) : undefined,
          flags: {
            autoGenerate: false,
            autoPublish: false
          }
        };
      });

      // Combine and set items
      setItems([...briefItems, ...articleItems]);
    } catch (err) {
      console.error('Error fetching content pipeline:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch content');
    } finally {
      setLoading(false);
    }
  }, [userToken, websiteToken, domain]);

  // Advance brief to draft (generate article)
  const advanceToDraft = useCallback(async (id: string) => {
    const briefId = id.replace('brief-', '');

    try {
      const response = await fetch('/api/articles/from-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          briefId: Number(briefId),
          websiteToken,
          domain
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate draft');
      }

      // Refresh content after generating
      await fetchContent();
    } catch (err) {
      console.error('Error advancing to draft:', err);
      throw err;
    }
  }, [userToken, websiteToken, domain, fetchContent]);

  // Schedule article for publication
  const scheduleForPublication = useCallback(async (id: string, date: Date) => {
    const articleId = id.replace('article-', '');

    try {
      const response = await fetch('/api/content/schedule-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          articleId: Number(articleId),
          scheduledDate: date.toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule article');
      }

      // Update local state optimistically
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === id
            ? { ...item, scheduledPublishAt: date.toISOString() }
            : item
        )
      );
    } catch (err) {
      console.error('Error scheduling article:', err);
      // Refresh to get correct state
      await fetchContent();
      throw err;
    }
  }, [userToken, fetchContent]);

  // Remove article from schedule
  const removeFromSchedule = useCallback(async (id: string) => {
    const articleId = id.replace('article-', '');

    try {
      const response = await fetch('/api/content/schedule-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          articleId: Number(articleId),
          scheduledDate: null // Explicitly set to null to unschedule
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove from schedule');
      }

      // Update local state
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === id
            ? { ...item, scheduledPublishAt: null }
            : item
        )
      );
    } catch (err) {
      console.error('Error removing from schedule:', err);
      // Refresh to get correct state
      await fetchContent();
      throw err;
    }
  }, [userToken, fetchContent]);

  // Schedule brief for article generation (cron will pick it up)
  const scheduleBriefForGeneration = useCallback(async (id: string, date: Date | null) => {
    const briefId = id.replace('brief-', '');

    try {
      const response = await fetch('/api/content/schedule-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          briefId: Number(briefId),
          scheduledDate: date ? date.toISOString() : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule brief');
      }

      // Update local state optimistically
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === id
            ? { ...item, scheduledDraftAt: date ? date.toISOString() : null }
            : item
        )
      );

      // Refresh to get updated data from server
      await fetchContent();
    } catch (err) {
      console.error('Error scheduling brief:', err);
      // Refresh to get correct state
      await fetchContent();
      throw err;
    }
  }, [userToken, fetchContent]);

  // Initial fetch
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return {
    items,
    loading,
    error,
    refresh: fetchContent,
    advanceToDraft,
    scheduleForPublication,
    removeFromSchedule,
    scheduleBriefForGeneration
  };
}
