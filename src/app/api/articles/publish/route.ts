import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userToken,
      articleId,
      publishDraft = true // Whether to publish as draft or immediately publish
    } = body;

    if (!userToken || !articleId) {
      return NextResponse.json(
        { error: 'Missing required fields: userToken, articleId' },
        { status: 400 }
      );
    }

    console.log('[PUBLISH API] Starting publication for article:', articleId);

    // Get the article and CMS connection
    const { data: article, error: fetchError } = await supabase
      .from('article_queue')
      .select(`
        *,
        cms_connections:cms_connection_id (
          id,
          base_url,
          api_token,
          content_type,
          cms_type
        ),
        websites:website_id (
          domain
        )
      `)
      .eq('id', articleId)
      .eq('user_token', userToken)
      .single();

    if (fetchError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    if (!article.article_content) {
      return NextResponse.json(
        { error: 'Article content not generated yet' },
        { status: 400 }
      );
    }

    if (!article.cms_connections) {
      return NextResponse.json(
        { error: 'No CMS connection found for this article' },
        { status: 400 }
      );
    }

    // Update status to publishing
    await supabase
      .from('article_queue')
      .update({ 
        status: 'publishing',
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId);

    // Log publishing start
    await supabase
      .from('article_generation_logs')
      .insert({
        article_queue_id: articleId,
        step: 'publishing',
        status: 'started',
        input_data: {
          cmsType: article.cms_connections.cms_type,
          contentType: article.cms_connections.content_type,
          publishDraft
        }
      });

    const publishStartTime = Date.now();

    try {
      let cmsArticleId: string;
      
      if (article.cms_connections.cms_type === 'strapi') {
        cmsArticleId = await publishToStrapi({
          baseUrl: article.cms_connections.base_url,
          apiToken: article.cms_connections.api_token,
          contentType: article.cms_connections.content_type,
          title: article.title,
          content: article.article_content,
          slug: article.slug,
          metaTitle: article.meta_title,
          metaDescription: article.meta_description,
          publishDraft
        });
      } else {
        throw new Error(`CMS type '${article.cms_connections.cms_type}' not supported yet`);
      }

      const publishTime = Math.round((Date.now() - publishStartTime) / 1000);

      // Update article with CMS ID and published status
      const { error: updateError } = await supabase
        .from('article_queue')
        .update({
          cms_article_id: cmsArticleId,
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId);

      if (updateError) {
        throw new Error(`Failed to update article status: ${updateError.message}`);
      }

      // Log successful publication
      await supabase
        .from('article_generation_logs')
        .insert({
          article_queue_id: articleId,
          step: 'publishing',
          status: 'completed',
          duration_seconds: publishTime,
          output_data: {
            cmsArticleId,
            publishedAt: new Date().toISOString()
          }
        });

      console.log('[PUBLISH API] Article published successfully:', articleId, 'CMS ID:', cmsArticleId);

      return NextResponse.json({
        success: true,
        cmsArticleId,
        publishedAt: new Date().toISOString()
      });

    } catch (publishError) {
      console.error('[PUBLISH API] Publication failed:', publishError);

      // Update status to failed
      await supabase
        .from('article_queue')
        .update({
          status: 'failed',
          error_message: publishError instanceof Error ? publishError.message : 'Publication failed',
          retry_count: (article.retry_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId);

      // Log failure
      await supabase
        .from('article_generation_logs')
        .insert({
          article_queue_id: articleId,
          step: 'publishing',
          status: 'failed',
          duration_seconds: Math.round((Date.now() - publishStartTime) / 1000),
          error_details: publishError instanceof Error ? publishError.message : 'Unknown error'
        });

      return NextResponse.json(
        { error: 'Article publication failed', details: publishError instanceof Error ? publishError.message : 'Unknown error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[PUBLISH API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function publishToStrapi({
  baseUrl,
  apiToken,
  contentType,
  title,
  content,
  slug,
  metaTitle,
  metaDescription,
  publishDraft
}: {
  baseUrl: string;
  apiToken: string;
  contentType: string;
  title: string;
  content: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  publishDraft: boolean;
}): Promise<string> {
  
  const cleanUrl = baseUrl.replace(/\/$/, '');
  
  // Convert contentType to endpoint URL
  let endpoint = contentType;
  if (contentType.startsWith('api::') && contentType.includes('::')) {
    // Convert api::article::article to api/articles
    const parts = contentType.split('::');
    if (parts.length === 3) {
      const singularName = parts[1];
      const pluralName = singularName.endsWith('y') 
        ? singularName.slice(0, -1) + 'ies'
        : singularName + 's';
      endpoint = `api/${pluralName}`;
    }
  }
  
  // If not already in correct format, assume it's ready to use
  if (!endpoint.startsWith('api/')) {
    endpoint = `api/${endpoint}`;
  }

  const url = `${cleanUrl}/${endpoint}`;
  
  console.log('[STRAPI PUBLISH] Publishing to:', url);

  // Prepare the article data according to Strapi v4 format
  const articleData = {
    data: {
      title,
      content: formatContentForStrapi(content),
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      ...(metaTitle && { metaTitle }),
      ...(metaDescription && { metaDescription }),
      publishedAt: publishDraft ? null : new Date().toISOString() // null = draft, date = published
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(articleData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[STRAPI PUBLISH] Error response:', response.status, errorText);
    
    if (response.status === 401) {
      throw new Error('Authentication failed. Please check your API token.');
    } else if (response.status === 404) {
      throw new Error(`Content type endpoint not found: ${endpoint}`);
    } else if (response.status === 400) {
      throw new Error(`Invalid data format: ${errorText}`);
    } else {
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  }

  const result = await response.json();
  console.log('[STRAPI PUBLISH] Success response:', result);

  // Extract the document ID from the response
  const documentId = result.data?.documentId || result.data?.id;
  
  if (!documentId) {
    throw new Error('No document ID returned from Strapi');
  }

  return documentId.toString();
}

function formatContentForStrapi(content: string): any {
  // For rich text fields, we need to convert markdown to Strapi's rich text format
  // For now, we'll use a simple conversion. In production, you might want a more sophisticated parser
  
  // Split content into blocks
  const lines = content.split('\n');
  const blocks: any[] = [];
  
  for (const line of lines) {
    if (line.trim() === '') continue;
    
    if (line.startsWith('# ')) {
      // H1 heading
      blocks.push({
        type: 'heading',
        level: 1,
        children: [
          {
            type: 'text',
            text: line.replace('# ', '')
          }
        ]
      });
    } else if (line.startsWith('## ')) {
      // H2 heading
      blocks.push({
        type: 'heading',
        level: 2,
        children: [
          {
            type: 'text',
            text: line.replace('## ', '')
          }
        ]
      });
    } else if (line.startsWith('### ')) {
      // H3 heading
      blocks.push({
        type: 'heading',
        level: 3,
        children: [
          {
            type: 'text',
            text: line.replace('### ', '')
          }
        ]
      });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // List item (would need more logic for complete lists)
      blocks.push({
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: '• ' + line.replace(/^[*-] /, '')
          }
        ]
      });
    } else {
      // Regular paragraph
      blocks.push({
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: line
          }
        ]
      });
    }
  }
  
  return blocks;
}