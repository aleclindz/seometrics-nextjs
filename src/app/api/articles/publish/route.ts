import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CMSManager } from '@/lib/cms/cms-manager';
import { uploadImagesToWordPress } from '@/lib/cms/wordpress-image-upload';

// Use Node.js runtime for longer timeout support (needed for CMS API calls)
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const cmsManager = new CMSManager();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userToken,
      articleId,
      publishDraft = true // Whether to publish as draft or immediately publish
    } = body;

    if (!userToken || !articleId) {
      console.error('[PUBLISH EDGE] 400 ERROR: Missing required fields', { userToken: !!userToken, articleId: !!articleId });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userToken, articleId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PUBLISH EDGE] Starting publication for article:', articleId);

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
      return new Response(
        JSON.stringify({ error: 'Article not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!article.article_content) {
      console.error('[PUBLISH EDGE] 400 ERROR: Article content not generated yet', { articleId, title: article.title });
      return new Response(
        JSON.stringify({ error: 'Article content not generated yet' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Resolve CMS connection: prefer article-level; fallback to website-level active connection
    let effectiveCms: any = (article as any).cms_connections || null;
    let effectiveCmsId: number | null = (article as any).cms_connection_id || null;

    console.log('[PUBLISH EDGE] CMS connection resolution:', {
      articleCmsConnectionId: effectiveCmsId,
      hasArticleLevelConnection: !!effectiveCms,
      websiteId: article.website_id,
      userToken: userToken.substring(0, 8) + '...'
    });

    if (!effectiveCms) {
      console.log('[PUBLISH EDGE] No article-level CMS connection, searching for website-level connection...');
      const { data: fallbackConn, error: fallbackError } = await supabase
        .from('cms_connections')
        .select('id, base_url, api_token, content_type, cms_type, status')
        .eq('user_token', userToken)
        .eq('website_id', article.website_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .maybeSingle();

      console.log('[PUBLISH EDGE] Fallback connection search result:', {
        found: !!fallbackConn,
        error: fallbackError?.message,
        cmsType: fallbackConn?.cms_type,
        baseUrl: fallbackConn?.base_url
      });

      if (fallbackConn) {
        effectiveCms = fallbackConn;
        effectiveCmsId = fallbackConn.id as unknown as number;
      }
    }

    if (!effectiveCms || !effectiveCmsId) {
      console.error('[PUBLISH EDGE] 400 ERROR: No CMS connection found', {
        articleId,
        websiteId: article.website_id,
        userToken: userToken.substring(0, 8) + '...',
        hasEffectiveCms: !!effectiveCms,
        hasEffectiveCmsId: !!effectiveCmsId
      });
      return new Response(
        JSON.stringify({
          error: 'No CMS connection found for this website',
          details: 'Please connect a CMS platform (WordPress, Strapi, etc.) in your website settings before publishing.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PUBLISH EDGE] Using CMS connection:', {
      id: effectiveCmsId,
      type: effectiveCms.cms_type,
      baseUrl: effectiveCms.base_url
    });

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
          cmsType: effectiveCms.cms_type,
          contentType: effectiveCms.content_type,
          publishDraft
        }
      });

    const publishStartTime = Date.now();

    try {
      let cmsArticleId: string;

      // Check if this is a new CMS connection (modular system)
      // Skip CMS Manager for Strapi and WordPress.com - they use legacy publishing paths
      if (effectiveCmsId && effectiveCms?.cms_type !== 'strapi' && effectiveCms?.cms_type !== 'wordpress_com') {
        // Use new modular CMS system for self-hosted WordPress, Webflow, Shopify
        try {
          const connection = await cmsManager.getConnection(String(effectiveCmsId), userToken);

          if (!connection) {
            console.log('[PUBLISH EDGE] New CMS connection not found, falling back to legacy system');
            throw new Error('CMS connection not found in new system');
          }

          console.log('[PUBLISH EDGE] Using new CMS system for:', connection.type);
          const provider = cmsManager.getProvider(connection.type);
        
          // Prepare article data
          const articleData = {
            title: article.meta_title || article.title,
            content: article.article_content,
            slug: article.slug,
            excerpt: article.meta_description || '',
            meta: {
              title: article.meta_title || article.title,
              description: article.meta_description || '',
            },
          };

          // Publish using the modular system
          const publishedArticle = await provider.publishArticle(
            connection.credentials, 
            articleData, 
            {
              status: publishDraft ? 'draft' : 'published',
              blogId: article.target_blog_id || undefined,
              collectionId: article.target_blog_id || undefined,
            }
          );

          cmsArticleId = publishedArticle.id;

          // Save the public URL if available from the CMS provider
          if (publishedArticle.url) {
            try {
              await supabase
                .from('article_queue')
                .update({
                  public_url: publishedArticle.url,
                  updated_at: new Date().toISOString()
                })
                .eq('id', articleId);
              console.log('[PUBLISH EDGE] Saved public URL from CMS:', publishedArticle.url);
            } catch (urlError) {
              console.error('[PUBLISH EDGE] Failed to save public URL:', urlError);
            }
          }

          // Store the published article in cms_articles table for tracking
          await supabase
            .from('cms_articles')
            .insert({
              connection_id: connection.id,
              article_queue_id: articleId,
              external_id: publishedArticle.id,
              title: publishedArticle.title,
              slug: publishedArticle.slug,
              status: publishedArticle.status,
              published_at: publishedArticle.publishedAt?.toISOString(),
              sync_status: 'synced',
            });

        } catch (newCMSError) {
          console.log('[PUBLISH EDGE] New CMS system failed, trying legacy system:', newCMSError);
          // Fall back to legacy system if new system fails
          if (effectiveCms?.cms_type === 'strapi') {
            const strapiFallback = await publishToStrapi({
              baseUrl: effectiveCms.base_url,
              apiToken: effectiveCms.api_token,
              contentType: effectiveCms.content_type,
              title: article.meta_title || article.title,
              content: article.article_content,
              slug: article.slug,
              metaTitle: article.meta_title,
              metaDescription: article.meta_description,
              publishDraft,
              cmsConnectionId: effectiveCmsId
            });
            cmsArticleId = strapiFallback.cmsId;
            if (strapiFallback.usedSlug && strapiFallback.usedSlug !== (article.slug || '')) {
              try {
                await supabase
                  .from('article_queue')
                  .update({ slug: strapiFallback.usedSlug, updated_at: new Date().toISOString() })
                  .eq('id', articleId);
              } catch {}
            }
          } else {
            throw newCMSError;
          }
        }
          
      } else if (effectiveCms?.cms_type === 'wordpress_com') {
        // Publish to WordPress.com via OAuth token
        const siteIdentifier = (() => { try { return new URL(effectiveCms.base_url).host; } catch { return effectiveCms.base_url; } })();
        const wpcomResult = await publishToWordPressCom({
          accessToken: effectiveCms.api_token,
          site: siteIdentifier,
          title: article.meta_title || article.title,
          content: article.article_content,
          slug: article.slug,
          publishDraft
        });
        cmsArticleId = wpcomResult.cmsId;

        // Save WordPress admin and public URLs immediately
        try {
          await supabase
            .from('article_queue')
            .update({
              cms_admin_url: wpcomResult.adminUrl,
              public_url: wpcomResult.publicUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', articleId);
          console.log('[WORDPRESS] Saved admin and public URLs');
        } catch (urlError) {
          console.error('[WORDPRESS] Failed to save URLs:', urlError);
        }

      } else if (effectiveCms?.cms_type === 'strapi') {
        // Legacy Strapi support
        const strapiResult = await publishToStrapi({
          baseUrl: effectiveCms.base_url,
          apiToken: effectiveCms.api_token,
          contentType: effectiveCms.content_type,
          title: article.meta_title || article.title,
          content: article.article_content,
          slug: article.slug,
          metaTitle: article.meta_title,
          metaDescription: article.meta_description,
          publishDraft,
          cmsConnectionId: effectiveCmsId
        });
        cmsArticleId = strapiResult.cmsId;
        // If slug was changed to satisfy uniqueness, update article record
        if (strapiResult.usedSlug && strapiResult.usedSlug !== (article.slug || '')) {
          try {
            await supabase
              .from('article_queue')
              .update({ slug: strapiResult.usedSlug, updated_at: new Date().toISOString() })
              .eq('id', articleId);
          } catch {}
        }
      } else {
        throw new Error('No valid CMS connection found. Please connect a CMS platform first.');
      }

      const publishTime = Math.round((Date.now() - publishStartTime) / 1000);

      // Minimal update first (DBs without url columns)
      const { error: minimalUpdateError } = await supabase
        .from('article_queue')
        .update({
          cms_article_id: cmsArticleId,
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          cms_connection_id: (article as any).cms_connection_id || effectiveCmsId
        })
        .eq('id', articleId);

      if (minimalUpdateError) {
        throw new Error(`Failed to update article status: ${minimalUpdateError.message}`);
      }

      // Best-effort: admin/public URLs (ONLY for Strapi - WordPress.com already saved correct URLs)
      // Skip this for WordPress.com since it already has correct URLs from API response
      if (effectiveCms?.cms_type === 'strapi') {
        try {
          const strapiAdminUrl = generateStrapiAdminUrl(
            effectiveCms.base_url,
            effectiveCms.content_type,
            cmsArticleId
          );
          const publicUrl = generatePublicArticleUrl(
            effectiveCms.base_url,
            (article.slug || generateOptimizedSlug(article.title))
          );
          await supabase
            .from('article_queue')
            .update({
              cms_admin_url: strapiAdminUrl,
              public_url: publicUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', articleId);
        } catch {}
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

      console.log('[PUBLISH EDGE] Article published successfully:', articleId, 'CMS ID:', cmsArticleId);

      return new Response(JSON.stringify({
        success: true,
        cmsArticleId,
        publishedAt: new Date().toISOString()
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (publishError) {
      console.error('[PUBLISH EDGE] Publication failed:', publishError);

      // Update status to publishing_failed
      await supabase
        .from('article_queue')
        .update({
          status: 'publishing_failed',
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

      return new Response(JSON.stringify({
        error: 'Article publication failed', 
        details: publishError instanceof Error ? publishError.message : 'Unknown error'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    console.error('[PUBLISH EDGE] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Clean HTML content for WordPress publishing
 * Fixes malformed HTML structure, especially images wrapped in header tags
 */
function cleanHtmlForWordPress(content: string): string {
  let cleaned = content.trim();

  // Fix: <h2><figure>...</figure>Text</h2> → <figure>...</figure><h2>Text</h2>
  // This handles the case where images are nested inside header tags with text following
  cleaned = cleaned.replace(/<h([1-6])>\s*(<figure[^>]*>[\s\S]*?<\/figure>)\s*(.*?)<\/h\1>/g, '$2<h$1>$3</h$1>');

  // Fix: <h2><figure>...</figure></h2><p>Text</p> → <figure>...</figure><h2>Text</h2>
  // This handles the case where the header text is in a following paragraph
  cleaned = cleaned.replace(/<h([1-6])>\s*(<figure[^>]*>[\s\S]*?<\/figure>)\s*<\/h\1>\s*<p>([^<]+)<\/p>/g, '$2<h$1>$3</h$1>');

  // Fix images wrapped in header tags with just figure (e.g., <h2><figure>...</figure></h2>)
  // Match patterns like <h2><figure>...</figure></h2> and extract just the figure
  cleaned = cleaned.replace(/<h([1-6])>\s*(<figure[^>]*>[\s\S]*?<\/figure>)\s*<\/h\1>/g, '$2');

  // Remove duplicate header text appearing in both H2 and immediately following paragraphs
  // Pattern: <h2>Introduction</h2><p>Introduction to the topic</p> where the header word is repeated
  cleaned = cleaned.replace(/<h([1-6])>([^<]+)<\/h\1>\s*<p>\2([^<]*)<\/p>/g, '<h$1>$2</h$1><p>$3</p>');

  // Fix headers that have content after the closing tag split incorrectly
  // Pattern: </h2>Content</h2> should be </h2><p>Content</p>
  cleaned = cleaned.replace(/<\/h([1-6])>([^<]+)<\/h\1>/g, '</h$1><p>$2</p>');

  // Remove paragraph tags wrapping headers
  cleaned = cleaned.replace(/<p>\s*(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>)\s*<\/p>/g, '$1');

  // Remove paragraph tags wrapping figures
  cleaned = cleaned.replace(/<p>\s*(<figure[^>]*>[\s\S]*?<\/figure>)\s*<\/p>/g, '$1');

  // Fix double-wrapped elements
  cleaned = cleaned.replace(/<h([1-6])>\s*<h\1>/g, '<h$1>');
  cleaned = cleaned.replace(/<\/h([1-6])>\s*<\/h\1>/g, '</h$1>');

  // Fix empty header tags
  cleaned = cleaned.replace(/<h([1-6])>\s*<\/h\1>/g, '');

  // Clean up excessive whitespace between tags
  cleaned = cleaned.replace(/>\s+</g, '><');

  // Add proper spacing between block elements
  cleaned = cleaned.replace(/<\/(h[1-6]|figure|ul|ol|blockquote)>/g, '</$1>\n');
  cleaned = cleaned.replace(/<(h[1-6]|figure|ul|ol|blockquote)/g, '\n<$1');

  // Remove empty paragraphs
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');

  // Clean up multiple consecutive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

// Removed: uploadImagesToWordPress function - now using shared utility from @/lib/cms/wordpress-image-upload

async function publishToWordPressCom({
  accessToken,
  site,
  title,
  content,
  slug,
  publishDraft
}: {
  accessToken: string;
  site: string; // site domain or ID
  title: string;
  content: string;
  slug?: string;
  publishDraft: boolean;
}): Promise<{ cmsId: string; adminUrl: string; publicUrl: string }> {
  // Step 1: Clean HTML for WordPress
  console.log('[WORDPRESS] Cleaning HTML markup...');
  let cleanedContent = cleanHtmlForWordPress(content);

  // Step 2: Upload images to WordPress Media Library
  console.log('[WORDPRESS] Uploading images to Media Library...');
  const uploadResult = await uploadImagesToWordPress({
    content: cleanedContent,
    authType: 'bearer',
    accessToken,
    siteUrl: site
  });
  cleanedContent = uploadResult.content;
  console.log(`[WORDPRESS] Uploaded ${uploadResult.uploadedImages.length} images`);

  // Step 3: Publish the article with cleaned content
  const endpoint = `https://public-api.wordpress.com/wp/v2/sites/${site}/posts`;
  const payload: any = {
    title,
    content: cleanedContent,
    status: publishDraft ? 'draft' : 'publish'
  };
  if (slug) payload.slug = slug;

  console.log('[WORDPRESS] Publishing to:', endpoint);
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`WordPress.com publish failed (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  const postId = String(data.id);

  // Step 4: Generate admin and public URLs
  const adminUrl = `https://wordpress.com/post/${site}/${postId}`;
  const publicUrl = data.link || `https://${site}/${data.slug}`;

  console.log('[WORDPRESS] Published successfully:', {
    postId,
    adminUrl,
    publicUrl
  });

  return {
    cmsId: postId,
    adminUrl,
    publicUrl
  };
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
  publishDraft,
  cmsConnectionId
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
  cmsConnectionId: number;
}): Promise<{ cmsId: string; usedSlug: string }> {
  
  const cleanUrl = baseUrl.replace(/\/$/, '');
  
  // Convert contentType to endpoint URL
  let endpoint = contentType;
  
  console.log('[STRAPI PUBLISH] Original content type:', contentType);
  
  if (contentType.startsWith('api::')) {
    // Handle formats like api::blog-post.blog-post or api::blog-post::blog-post
    const parts = contentType.split('::');
    console.log('[STRAPI PUBLISH] Content type parts:', parts);
    
    if (parts.length >= 2) {
      // Get the content type name - could be "blog-post.blog-post" or just "blog-post"
      let singularName = parts[1];
      
      // If it contains a dot, take the first part (e.g., "blog-post.blog-post" -> "blog-post")
      if (singularName.includes('.')) {
        singularName = singularName.split('.')[0];
      }
      
      console.log('[STRAPI PUBLISH] Singular name extracted:', singularName);
      
      // Handle pluralization for hyphenated words
      let pluralName;
      if (singularName.endsWith('y') && !singularName.endsWith('ay') && !singularName.endsWith('ey') && !singularName.endsWith('oy') && !singularName.endsWith('uy')) {
        pluralName = singularName.slice(0, -1) + 'ies';
      } else if (singularName.endsWith('s') || singularName.endsWith('sh') || singularName.endsWith('ch') || singularName.endsWith('x') || singularName.endsWith('z')) {
        pluralName = singularName + 'es';
      } else {
        pluralName = singularName + 's';
      }
      endpoint = `api/${pluralName}`;
      console.log('[STRAPI PUBLISH] Converted to endpoint:', endpoint);
    }
  } else if (!endpoint.startsWith('api/')) {
    // If not already in correct format, assume it's ready to use
    endpoint = `api/${endpoint}`;
    console.log('[STRAPI PUBLISH] Added api/ prefix:', endpoint);
  }

  const url = `${cleanUrl}/${endpoint}`;
  
  console.log('[STRAPI PUBLISH] Publishing to:', url);
  console.log('[STRAPI PUBLISH] Content type:', contentType);
  console.log('[STRAPI PUBLISH] Endpoint:', endpoint);

  // Get schema information for better formatting
  const schemaInfo = await getContentTypeSchema(cmsConnectionId.toString(), contentType);
  
  // Prepare the article data according to Strapi v4 format with enhanced formatting
  const formattedContent = formatContentForPublication(content, schemaInfo);
  
  // Build article data with schema-aware field mapping
  let usedSlug = slug || generateOptimizedSlug(title);
  let articleData: any = {
    data: {
      title,
      content: formattedContent,
      slug: usedSlug,
      publishedAt: publishDraft ? null : new Date().toISOString() // null = draft, date = published
    }
  };

  // Add optional fields based on schema and availability
  if (metaTitle && schemaInfo?.fields_config?.metaTitle) {
    articleData.data.metaTitle = metaTitle;
  } else if (metaTitle && schemaInfo?.fields_config?.meta_title) {
    articleData.data.meta_title = metaTitle;
  } else if (metaTitle && schemaInfo?.fields_config?.seoTitle) {
    articleData.data.seoTitle = metaTitle;
  }

  if (metaDescription && schemaInfo?.fields_config?.metaDescription) {
    articleData.data.metaDescription = metaDescription;
  } else if (metaDescription && schemaInfo?.fields_config?.meta_description) {
    articleData.data.meta_description = metaDescription;
  } else if (metaDescription && schemaInfo?.fields_config?.seoDescription) {
    articleData.data.seoDescription = metaDescription;
  }

  // Add excerpt if schema supports it
  if (schemaInfo?.hasExcerpt) {
    articleData.data.excerpt = generateExcerpt(content);
  }

  console.log('[STRAPI PUBLISH] Article data:', JSON.stringify(articleData, null, 2));

  const doRequest = async () => {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(articleData)
    });
    return resp;
  };

  let response = await doRequest();
  if (!response.ok && response.status === 400) {
    const text = await response.text();
    // Handle unique slug error by retrying with a suffix
    if (text.includes('This attribute must be unique') && text.toLowerCase().includes('slug')) {
      usedSlug = `${usedSlug}-${Math.random().toString(36).slice(2, 6)}`;
      articleData.data.slug = usedSlug;
      response = await doRequest();
    } else {
      // Fall through to detailed error handling below
      // restore the text into a variable for error throw
      // but since we've consumed text, set a marker
      (response as any)._consumedErrorText = text;
    }
  }

  if (!response.ok) {
    const errorText = (response as any)._consumedErrorText || await response.text();
    console.error('[STRAPI PUBLISH] Error response:', response.status, errorText);
    console.error('[STRAPI PUBLISH] Request URL:', url);
    console.error('[STRAPI PUBLISH] Request headers:', {
      'Authorization': `Bearer ${apiToken ? apiToken.substring(0, 10) + '...' : 'missing'}`,
      'Content-Type': 'application/json'
    });
    if (response.status === 401) {
      throw new Error('Authentication failed. Please check your API token.');
    } else if (response.status === 404) {
      throw new Error(`Content type endpoint not found: ${endpoint}. Check if the content type exists in Strapi.`);
    } else if (response.status === 400) {
      throw new Error(`Invalid data format: ${errorText}`);
    } else if (response.status === 405) {
      throw new Error(`Method not allowed for endpoint: ${endpoint}. The Strapi endpoint may not support POST requests or the content type may be incorrect.`);
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

  return { cmsId: documentId.toString(), usedSlug };
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

async function getContentTypeSchema(connectionId: string, contentType: string) {
  try {
    const { data: schema } = await supabase
      .from('cms_content_schemas')
      .select('fields_config')
      .eq('connection_id', connectionId)
      .eq('content_type_name', contentType)
      .single();
    
    return schema?.fields_config || null;
  } catch (error) {
    console.log('[STRAPI PUBLISH] Could not fetch schema info:', error);
    return null;
  }
}

function formatContentForPublication(content: string, schemaInfo: any): string {
  // Enhanced HTML formatting for better article presentation
  let formattedContent = content.trim();
  
  // If content is already HTML (starts with HTML tags), clean it up extensively
  if (formattedContent.startsWith('<')) {
    // Remove any malformed paragraph wrapping around headers
    formattedContent = formattedContent.replace(/<p>\s*<h([1-6])>/g, '<h$1>');
    formattedContent = formattedContent.replace(/<\/h([1-6])>\s*<\/p>/g, '</h$1>');
    
    // Clean up malformed nested lists
    formattedContent = formattedContent.replace(/<ul><ul>/g, '<ul>');
    formattedContent = formattedContent.replace(/<\/ul><\/ul>/g, '</ul>');
    
    // Fix double closing paragraph tags
    formattedContent = formattedContent.replace(/<\/p><\/p>/g, '</p>');
    
    // Remove paragraph tags around headers
    formattedContent = formattedContent.replace(/<p>(<h[1-6].*?<\/h[1-6]>)<\/p>/g, '$1');
    
    // Clean up excessive line breaks and paragraph spacing
    formattedContent = formattedContent.replace(/<\/p><br>\s*<br>\s*<p>/g, '</p>\n<p>');
    formattedContent = formattedContent.replace(/<br>\s*<br>/g, '</p>\n<p>');
    
    // Remove empty paragraphs
    formattedContent = formattedContent.replace(/<p>\s*<\/p>/g, '');
    
    // Ensure proper spacing between elements
    formattedContent = formattedContent.replace(/><h/g, '>\n<h');
    formattedContent = formattedContent.replace(/><p/g, '>\n<p');
    formattedContent = formattedContent.replace(/><ul/g, '>\n<ul');
    formattedContent = formattedContent.replace(/><div/g, '>\n<div');
    
    // Clean up any remaining malformed structures
    formattedContent = formattedContent.replace(/<p([^>]*)>/g, (match, attrs) => {
      // If this paragraph contains a header, remove the paragraph wrapper
      const nextTag = formattedContent.substring(formattedContent.indexOf(match) + match.length, formattedContent.indexOf(match) + match.length + 10);
      if (nextTag.includes('<h')) {
        return '';
      }
      return match;
    });
    
    // Final cleanup
    formattedContent = formattedContent.replace(/\n{3,}/g, '\n\n');
    formattedContent = formattedContent.trim();
    
    return formattedContent;
  }
  
  // Convert markdown-style formatting to HTML
  // Process line by line to maintain structure
  const lines = formattedContent.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      // Empty line - close any open lists and add spacing
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      continue; // Skip empty lines for cleaner output
    }
    
    // Headers
    if (line.startsWith('#### ')) {
      if (inList) { processedLines.push('</ul>'); inList = false; }
      processedLines.push(`<h4>${line.substring(5)}</h4>`);
    } else if (line.startsWith('### ')) {
      if (inList) { processedLines.push('</ul>'); inList = false; }
      processedLines.push(`<h3>${line.substring(4)}</h3>`);
    } else if (line.startsWith('## ')) {
      if (inList) { processedLines.push('</ul>'); inList = false; }
      processedLines.push(`<h2>${line.substring(3)}</h2>`);
    } else if (line.startsWith('# ')) {
      if (inList) { processedLines.push('</ul>'); inList = false; }
      processedLines.push(`<h1>${line.substring(2)}</h1>`);
    } 
    // List items
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      const listContent = line.substring(2);
      // Apply bold/italic formatting to list content
      const formattedListContent = listContent
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
      processedLines.push(`<li>${formattedListContent}</li>`);
    }
    // Regular paragraphs
    else {
      if (inList) { processedLines.push('</ul>'); inList = false; }
      // Apply bold/italic formatting
      const formattedLine = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
      processedLines.push(`<p>${formattedLine}</p>`);
    }
  }
  
  // Close any remaining open lists
  if (inList) {
    processedLines.push('</ul>');
  }
  
  // Join with single newlines for clean HTML
  let result = processedLines.join('\n');
  
  return result;
}

function generateOptimizedSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 60); // Limit length
}

function generateExcerpt(content: string, maxLength: number = 160): string {
  // Strip HTML tags
  const textContent = content.replace(/<[^>]*>/g, '');
  
  // Get first paragraph or first 160 characters
  const firstParagraph = textContent.split('\n\n')[0];
  const excerpt = firstParagraph.length > maxLength 
    ? firstParagraph.substring(0, maxLength - 3) + '...'
    : firstParagraph;
    
  return excerpt.trim();
}

function generateStrapiAdminUrl(baseUrl: string, contentType: string, documentId: string): string {
  // Generate Strapi admin deep-link URL for editing the published article
  const cleanUrl = baseUrl.replace(/\/$/, '');
  
  // Convert api::content-type::content-type to admin URL format
  let adminPath = contentType;
  
  if (contentType.startsWith('api::')) {
    // Handle formats like api::blog-post::blog-post
    const parts = contentType.split('::');
    if (parts.length >= 2) {
      const singularName = parts[1];
      // Convert to plural for admin URL
      let pluralName;
      if (singularName.endsWith('y') && !['ay', 'ey', 'oy', 'uy'].some(suffix => singularName.endsWith(suffix))) {
        pluralName = singularName.slice(0, -1) + 'ies';
      } else if (['s', 'sh', 'ch', 'x', 'z'].some(suffix => singularName.endsWith(suffix))) {
        pluralName = singularName + 'es';
      } else {
        pluralName = singularName + 's';
      }
      adminPath = `content-manager/collection-types/api::${singularName}.${singularName}/${documentId}`;
    }
  }
  
  return `${cleanUrl}/admin/content-manager/collection-types/${contentType}/${documentId}`;
}

function generatePublicArticleUrl(baseUrl: string, slug: string): string {
  // Generate public URL for the published article
  const cleanUrl = baseUrl.replace(/\/$/, '');
  const cleanSlug = slug.replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes
  
  // For most websites, articles are at /blog/slug
  // This can be made configurable later based on CMS configuration
  return `${cleanUrl}/blog/${cleanSlug}`;
}
