import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Get the article details
    const { data: article, error: articleError } = await supabase
      .from('articles')
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
    const websiteToken = article.website_token;
    const { data: connection, error: connectionError } = await supabase
      .from('cms_connections')
      .select('*')
      .eq('user_token', userToken)
      .eq('website_token', websiteToken)
      .single();

    if (connectionError || !connection) {
      console.error('[PUBLISH ARTICLE] No CMS connection found:', connectionError);
      return NextResponse.json(
        { error: 'No CMS connection found for this website. Please connect a CMS first.' },
        { status: 404 }
      );
    }

    console.log('[PUBLISH ARTICLE] Publishing to CMS type:', connection.cms_type);

    // Prepare article data for CMS
    const publishData = {
      userToken,
      connectionId: connection.id,
      title: article.title,
      content: article.article_content || article.content,
      slug: article.slug || generateSlug(article.title),
      status: 'published', // Immediately publish
      excerpt: article.meta_description || '',
      categories: article.topic_cluster ? [article.topic_cluster] : [],
      tags: Array.isArray(article.target_keywords)
        ? article.target_keywords.map((kw: any) =>
            typeof kw === 'string' ? kw : kw.term || kw.keyword
          )
        : [],
      seoTitle: article.meta_title || article.title,
      seoDescription: article.meta_description || ''
    };

    // Call the appropriate CMS publish endpoint
    let publishEndpoint = '';
    switch (connection.cms_type) {
      case 'wordpress':
      case 'wordpress_com':
        publishEndpoint = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cms/wordpress/publish`;
        break;
      case 'ghost':
        publishEndpoint = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cms/ghost/publish`;
        break;
      default:
        return NextResponse.json(
          { error: `CMS type '${connection.cms_type}' is not yet supported for auto-publishing` },
          { status: 400 }
        );
    }

    console.log('[PUBLISH ARTICLE] Calling CMS publish endpoint:', publishEndpoint);

    const publishResponse = await fetch(publishEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(publishData)
    });

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json();
      console.error('[PUBLISH ARTICLE] CMS publish failed:', errorData);

      // Update article status to show failure
      await supabase
        .from('articles')
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

    // Update article status in database
    const { data: updatedArticle, error: updateError } = await supabase
      .from('articles')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        public_url: publishResult.url || publishResult.article?.url,
        cms_post_id: publishResult.wordPressId || publishResult.article?.id || publishResult.ghostId,
        error_message: null
      })
      .eq('id', articleId)
      .select()
      .single();

    if (updateError) {
      console.error('[PUBLISH ARTICLE] Failed to update article status:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Article published successfully',
      article: updatedArticle || article,
      url: publishResult.url || publishResult.article?.url
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
