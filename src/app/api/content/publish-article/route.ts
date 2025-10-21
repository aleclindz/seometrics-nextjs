import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LinkInjector } from '@/services/content/link-injector';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userToken, articleId } = body;

    if (!userToken || !articleId) {
      return NextResponse.json(
        { error: 'Missing required fields: userToken, articleId' },
        { status: 400 }
      );
    }

    console.log('[PUBLISH ARTICLE] Publishing article:', articleId);

    // Get the article details - CORRECTED: use article_queue table
    const { data: article, error: articleError } = await supabase
      .from('article_queue')
      .select('*, websites(*)')
      .eq('id', articleId)
      .eq('user_token', userToken)
      .single();

    if (articleError || !article) {
      console.error('[PUBLISH ARTICLE] Article not found:', articleError);
      return NextResponse.json(
        { error: 'Article not found or access denied' },
        { status: 404 }
      );
    }

    // Check if article is in draft status
    if (article.status !== 'generated' && article.status !== 'draft') {
      return NextResponse.json(
        { error: 'Article must be in draft or generated status to publish' },
        { status: 400 }
      );
    }

    // Get the CMS connection for the website
    const website = article.websites;
    if (!website || !website.id || !website.website_token) {
      return NextResponse.json(
        { error: 'Article website information is missing' },
        { status: 400 }
      );
    }

    const websiteId = website.id;
    const websiteToken = website.website_token;

    const { data: connection, error: connectionError } = await supabase
      .from('cms_connections')
      .select('*')
      .eq('user_token', userToken)
      .eq('website_id', websiteId)
      .single();

    if (connectionError || !connection) {
      console.error('[PUBLISH ARTICLE] No CMS connection found:', connectionError);
      return NextResponse.json(
        { error: 'No CMS connection found for this website. Please connect a CMS first.' },
        { status: 404 }
      );
    }

    console.log('[PUBLISH ARTICLE] Publishing to CMS type:', connection.cms_type);

    // Get article content
    let articleContent = article.article_content || article.content;
    let injectedLinksMetadata = null;

    // Inject internal links if brief has a link plan
    if (article.generated_from_brief_id) {
      try {
        const { data: brief } = await supabase
          .from('article_briefs')
          .select('internal_link_plan')
          .eq('id', article.generated_from_brief_id)
          .maybeSingle();

        if (brief?.internal_link_plan) {
          console.log('[PUBLISH ARTICLE] Found internal link plan, injecting links...');
          const linkInjector = new LinkInjector();
          const injectionResult = await linkInjector.injectInternalLinks(
            articleId,
            articleContent,
            brief.internal_link_plan,
            websiteToken
          );

          articleContent = injectionResult.updatedContent;
          injectedLinksMetadata = injectionResult.insertedLinks;

          console.log('[PUBLISH ARTICLE] Injected', injectionResult.insertedLinks.length, 'internal links');
          if (injectionResult.skippedLinks > 0) {
            console.log('[PUBLISH ARTICLE] Skipped', injectionResult.skippedLinks, 'links (targets not published yet)');
          }
        }
      } catch (linkError) {
        console.error('[PUBLISH ARTICLE] Error injecting internal links:', linkError);
        // Continue with publishing even if link injection fails
      }
    }

    // Update article content with injected links if available
    if (injectedLinksMetadata && injectedLinksMetadata.length > 0) {
      await supabase
        .from('article_queue')
        .update({
          article_content: articleContent,
          injected_internal_links: injectedLinksMetadata
        })
        .eq('id', articleId);
    }

    // Call the unified publish endpoint which has all the WordPress improvements
    // (image upload, HTML cleanup, status verification)
    const publishEndpoint = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/articles/publish`;

    console.log('[PUBLISH ARTICLE] Calling unified publish endpoint:', publishEndpoint);

    const publishResponse = await fetch(publishEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userToken,
        articleId,
        publishDraft: false // Immediately publish, not as draft
      })
    });

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json();
      console.error('[PUBLISH ARTICLE] CMS publish failed:', errorData);

      // Update article status to show failure - CORRECTED: use article_queue table
      await supabase
        .from('article_queue')
        .update({
          status: 'publishing_failed',
          error_message: errorData.error || 'Failed to publish to CMS'
        })
        .eq('id', articleId);

      return NextResponse.json(
        { error: errorData.error || 'Failed to publish to CMS', details: errorData },
        { status: publishResponse.status }
      );
    }

    const publishResult = await publishResponse.json();
    console.log('[PUBLISH ARTICLE] Successfully published to CMS:', publishResult);

    // The unified publish endpoint already updated the article_queue table
    // So we just need to fetch the latest data
    const { data: updatedArticle } = await supabase
      .from('article_queue')
      .select('*, websites(*)')
      .eq('id', articleId)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Article published successfully',
      article: updatedArticle || article,
      cmsArticleId: publishResult.cmsArticleId,
      publishedAt: publishResult.publishedAt
    });

  } catch (error) {
    console.error('[PUBLISH ARTICLE] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error during article publishing' },
      { status: 500 }
    );
  }
}

// Helper function to generate a URL-friendly slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}
