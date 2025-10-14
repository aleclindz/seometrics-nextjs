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
  status?: string; // Article generation status: 'pending', 'generating', 'generated', 'published', etc.
  articleContent?: string; // Generated article content for preview
  flags?: {
    autoGenerate?: boolean;
    autoPublish?: boolean;
  };
}

interface UseContentPipelineProps {
  userToken: string;
  websiteToken: string;
  domain: string;
  conversationId?: string | null;
}

export function useContentPipeline({ userToken, websiteToken, domain, conversationId }: UseContentPipelineProps) {
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

      // Transform briefs to ContentItems (filter out briefs that have already been generated into articles)
      const briefItems: ContentItem[] = (briefsData.queue || [])
        .filter((brief: any) => {
          // Only include briefs that haven't been generated yet
          const hasBeenGenerated = brief.generated_article_id || brief.status === 'generated' || brief.status === 'generating';
          return !hasBeenGenerated;
        })
        .map((brief: any) => ({
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
          status: article.status, // Include article status
          articleContent: article.article_content, // Include content for preview
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

  // Advance brief to draft (generate article) - LIVE without page refresh
  const advanceToDraft = useCallback(async (id: string) => {
    console.log('[ADVANCE TO DRAFT] 🚀 Starting generation for brief:', id);
    console.log('[ADVANCE TO DRAFT] 📊 Current state:', {
      conversationId,
      websiteToken: websiteToken ? '✅ Present' : '❌ Missing',
      userToken: userToken ? '✅ Present' : '❌ Missing',
      domain
    });

    const briefId = id.replace('brief-', '');

    // Get the brief details before removing it
    const brief = items.find(item => item.id === id);
    if (!brief) {
      console.error('[ADVANCE TO DRAFT] ❌ Brief not found:', id);
      throw new Error('Brief not found');
    }

    console.log('[ADVANCE TO DRAFT] 📝 Brief details:', {
      title: brief.title,
      cluster: brief.cluster,
      keywords: brief.keywords?.length || 0
    });

    // Generate temporary article ID for optimistic update
    const tempArticleId = `article-temp-${briefId}`;

    try {
      // STEP 1: Optimistic UI update - remove brief, add generating article
      console.log('[ADVANCE TO DRAFT] 🎨 Step 1: Optimistic UI update');
      setItems(prevItems => {
        const withoutBrief = prevItems.filter(item => item.id !== id);
        const generatingArticle: ContentItem = {
          id: tempArticleId,
          cluster: brief.cluster,
          stage: 'draft' as ArticleStage,
          title: brief.title,
          brief: brief.brief,
          keywords: brief.keywords,
          wordGoal: brief.wordGoal,
          createdAt: new Date().toISOString(),
          scheduledDraftAt: null,
          scheduledPublishAt: null,
          status: 'generating', // Show "Generating..." badge
          articleContent: undefined,
          flags: {
            autoGenerate: false,
            autoPublish: false
          }
        };
        return [...withoutBrief, generatingArticle];
      });

      // STEP 2: Send immediate agent message
      const sendAgentMessage = async (message: string, actionCard?: any) => {
        console.log('[ADVANCE TO DRAFT] 💬 Attempting to send agent message:', message.substring(0, 100) + '...');

        // Check prerequisites
        if (!websiteToken) {
          console.warn('[ADVANCE TO DRAFT] ⚠️ Cannot send agent message - websiteToken is missing');
          return;
        }

        // Auto-create conversation if missing
        let activeConversationId = conversationId;
        if (!activeConversationId) {
          console.warn('[ADVANCE TO DRAFT] ⚠️ conversationId is missing - creating new conversation');
          activeConversationId = crypto.randomUUID();
          console.log('[ADVANCE TO DRAFT] 🆕 Generated new conversationId:', activeConversationId);
        }

        try {
          console.log('[ADVANCE TO DRAFT] 📤 Sending POST to /api/agent/conversations');
          const response = await fetch('/api/agent/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userToken,
              websiteToken,
              conversationId: activeConversationId,
              message,
              actionCard
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[ADVANCE TO DRAFT] ❌ Agent message POST failed:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText
            });
          } else {
            const data = await response.json();
            console.log('[ADVANCE TO DRAFT] ✅ Agent message sent successfully:', data);
          }
        } catch (err) {
          console.error('[ADVANCE TO DRAFT] ❌ Failed to send agent message:', err);
        }
      };

      console.log('[ADVANCE TO DRAFT] 📨 Step 2: Sending initial agent notification');
      await sendAgentMessage(
        `🚀 **Generating Article**\n\n📝 **"${brief.title}"**\n\nTurning this brief into a full article. This usually takes 1-2 minutes...`
      );

      // STEP 3: Call API to start generation (with conversationId)
      console.log('[ADVANCE TO DRAFT] 🔨 Step 3: Calling /api/articles/from-brief');
      const response = await fetch('/api/articles/from-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          briefId: Number(briefId),
          websiteToken,
          domain,
          conversationId // Pass conversationId for callback
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[ADVANCE TO DRAFT] ❌ Article generation API failed:', errorData);
        throw new Error(errorData.error || 'Failed to start article generation');
      }

      const data = await response.json();
      const actualArticleId = data.articleId;
      console.log('[ADVANCE TO DRAFT] ✅ Article generation started - articleId:', actualArticleId);
      console.log('[ADVANCE TO DRAFT] 📋 Full response data:', {
        hasArticleId: !!data.articleId,
        hasTitle: !!data.title,
        status: data.status,
        keys: Object.keys(data)
      });

      if (!actualArticleId) {
        console.error('[ADVANCE TO DRAFT] ❌ CRITICAL: articleId is undefined! Response:', data);
        throw new Error('Article ID not returned from API');
      }

      // STEP 4: Poll for status updates (check every 10 seconds for up to 5 minutes)
      console.log('[ADVANCE TO DRAFT] 🔄 Step 4: Starting polling for completion');
      const pollForCompletion = async () => {
        const maxAttempts = 30; // 30 attempts × 10 seconds = 5 minutes
        let attempts = 0;

        const checkStatus = async (): Promise<boolean> => {
          try {
            attempts++;
            console.log(`[ADVANCE TO DRAFT] 🔍 Polling attempt ${attempts}/${maxAttempts} for articleId: ${actualArticleId}`);

            // Fetch article status
            const statusResponse = await fetch(
              `/api/articles/${actualArticleId}?userToken=${encodeURIComponent(userToken)}`
            );

            if (!statusResponse.ok) {
              console.warn('[ADVANCE TO DRAFT] ⚠️ Status fetch failed:', statusResponse.status);
              return false;
            }

            const statusData = await statusResponse.json();
            const article = statusData.article;

            if (!article) {
              console.warn('[ADVANCE TO DRAFT] ⚠️ Article not found in response');
              return false;
            }

            console.log('[ADVANCE TO DRAFT] 📊 Current article status:', {
              status: article.status,
              title: article.title,
              hasContent: !!article.article_content
            });

            // Update the temporary article with real data
            setItems(prevItems =>
              prevItems.map(item =>
                item.id === tempArticleId
                  ? {
                      id: `article-${actualArticleId}`,
                      cluster: article.topic_cluster || brief.cluster,
                      stage: 'draft' as ArticleStage,
                      title: article.title || brief.title,
                      brief: article.title || brief.brief,
                      keywords: Array.isArray(article.target_keywords)
                        ? article.target_keywords.map((kw: any) => ({
                            term: typeof kw === 'string' ? kw : kw.term || kw.keyword,
                            vol: typeof kw === 'object' ? kw.vol : undefined
                          }))
                        : brief.keywords,
                      wordGoal: article.word_count || brief.wordGoal,
                      createdAt: article.created_at || new Date().toISOString(),
                      scheduledDraftAt: null,
                      scheduledPublishAt: article.scheduled_publish_at || null,
                      status: article.status,
                      articleContent: article.article_content,
                      url: undefined,
                      flags: {
                        autoGenerate: false,
                        autoPublish: false
                      }
                    }
                  : item
              )
            );

            // Check if generation is complete
            if (article.status === 'generated') {
              console.log('[ADVANCE TO DRAFT] 🎉 Article generation completed!');
              await sendAgentMessage(
                `✅ **Article Generated!**\n\n📝 **"${article.title}"**\n\nYour article is ready to preview and schedule for publication in the Content tab.`
              );
              return true; // Completed
            } else if (article.status === 'generation_failed') {
              console.error('[ADVANCE TO DRAFT] ❌ Article generation failed');
              throw new Error('Article generation failed');
            }

            console.log('[ADVANCE TO DRAFT] ⏳ Still processing, will check again in 10 seconds');
            return false; // Still processing
          } catch (err) {
            console.error('[ADVANCE TO DRAFT] ❌ Error checking status:', err);
            return false;
          }
        };

        // Poll every 10 seconds
        while (attempts < maxAttempts) {
          const isComplete = await checkStatus();
          if (isComplete) {
            console.log('[ADVANCE TO DRAFT] ✅ Polling complete - article generated successfully');
            return; // Success!
          }

          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        }

        // Timeout after max attempts
        console.warn('[ADVANCE TO DRAFT] ⏰ Polling timeout after', maxAttempts, 'attempts - refreshing content');
        await fetchContent(); // Full refresh as fallback
      };

      // Start polling (non-blocking)
      console.log('[ADVANCE TO DRAFT] 🚀 Polling started in background');
      pollForCompletion();

    } catch (err) {
      console.error('[ADVANCE TO DRAFT] ❌ Fatal error during article generation:', err);

      // Revert optimistic update on error
      console.log('[ADVANCE TO DRAFT] ↩️ Reverting optimistic UI update');
      setItems(prevItems => {
        const withoutTemp = prevItems.filter(item => item.id !== tempArticleId);
        return [...withoutTemp, brief]; // Restore original brief
      });

      throw err;
    }
  }, [userToken, websiteToken, domain, conversationId, items, fetchContent]);

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

  // Remove article or brief from schedule
  const removeFromSchedule = useCallback(async (id: string) => {
    // Detect if this is a brief or article
    const isBrief = id.startsWith('brief-');
    const isArticle = id.startsWith('article-');

    if (!isBrief && !isArticle) {
      console.error('Unknown item type:', id);
      throw new Error('Invalid item ID');
    }

    try {
      if (isBrief) {
        // For briefs, call scheduleBriefForGeneration with null date
        await scheduleBriefForGeneration(id, null);
      } else {
        // For articles, use existing schedule-article API
        const articleId = id.replace('article-', '');

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

        // Update local state for articles
        setItems(prevItems =>
          prevItems.map(item =>
            item.id === id
              ? { ...item, scheduledPublishAt: null }
              : item
          )
        );
      }
    } catch (err) {
      console.error('Error removing from schedule:', err);
      // Refresh to get correct state
      await fetchContent();
      throw err;
    }
  }, [userToken, scheduleBriefForGeneration, fetchContent]);

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
