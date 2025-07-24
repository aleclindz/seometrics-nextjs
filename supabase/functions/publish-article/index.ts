import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userToken, articleId, publishDraft = true } = await req.json()

    if (!userToken || !articleId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userToken, articleId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[PUBLISH EDGE FUNCTION] Starting publication for article:', articleId)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
      .single()

    if (fetchError || !article) {
      return new Response(
        JSON.stringify({ error: 'Article not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!article.article_content) {
      return new Response(
        JSON.stringify({ error: 'Article content not generated yet' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!article.cms_connections) {
      return new Response(
        JSON.stringify({ error: 'No CMS connection found for this article' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update status to publishing
    await supabase
      .from('article_queue')
      .update({ 
        status: 'publishing',
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId)

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
      })

    const publishStartTime = Date.now()

    try {
      let cmsArticleId: string

      // For now, only handle Strapi (legacy system)
      if (article.cms_connections?.cms_type === 'strapi') {
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
        })
      } else {
        throw new Error('Only Strapi CMS is currently supported in Supabase Edge Functions')
      }

      const publishTime = Math.round((Date.now() - publishStartTime) / 1000)

      // Update article with CMS ID and published status
      const { error: updateError } = await supabase
        .from('article_queue')
        .update({
          cms_article_id: cmsArticleId,
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId)

      if (updateError) {
        throw new Error(`Failed to update article status: ${updateError.message}`)
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
        })

      console.log('[PUBLISH EDGE FUNCTION] Article published successfully:', articleId, 'CMS ID:', cmsArticleId)

      return new Response(JSON.stringify({
        success: true,
        cmsArticleId,
        publishedAt: new Date().toISOString()
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })

    } catch (publishError) {
      console.error('[PUBLISH EDGE FUNCTION] Publication failed:', publishError)

      // Update status to publishing_failed
      await supabase
        .from('article_queue')
        .update({
          status: 'publishing_failed',
          error_message: publishError instanceof Error ? publishError.message : 'Publication failed',
          retry_count: (article.retry_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId)

      // Log failure
      await supabase
        .from('article_generation_logs')
        .insert({
          article_queue_id: articleId,
          step: 'publishing',
          status: 'failed',
          duration_seconds: Math.round((Date.now() - publishStartTime) / 1000),
          error_details: publishError instanceof Error ? publishError.message : 'Unknown error'
        })

      return new Response(JSON.stringify({
        error: 'Article publication failed', 
        details: publishError instanceof Error ? publishError.message : 'Unknown error'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

  } catch (error) {
    console.error('[PUBLISH EDGE FUNCTION] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

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
  baseUrl: string
  apiToken: string
  contentType: string
  title: string
  content: string
  slug?: string
  metaTitle?: string
  metaDescription?: string
  publishDraft: boolean
}): Promise<string> {
  
  const cleanUrl = baseUrl.replace(/\/$/, '')
  
  // Convert contentType to endpoint URL with improved parsing
  let endpoint = contentType
  
  console.log('[STRAPI PUBLISH] Original content type:', contentType)
  
  if (contentType.startsWith('api::') && contentType.includes('::')) {
    // Handle formats like: api::blog-post::blog-post or api::article::article
    const parts = contentType.split('::')
    console.log('[STRAPI PUBLISH] Content type parts:', parts)
    
    if (parts.length >= 2) {
      const singularName = parts[1] // e.g., "blog-post" or "article"
      
      // Handle pluralization for hyphenated words and regular words
      let pluralName
      if (singularName.endsWith('y') && !['ay', 'ey', 'oy', 'uy'].some(suffix => singularName.endsWith(suffix))) {
        pluralName = singularName.slice(0, -1) + 'ies'
      } else if (['s', 'sh', 'ch', 'x', 'z'].some(suffix => singularName.endsWith(suffix))) {
        pluralName = singularName + 'es'
      } else {
        pluralName = singularName + 's'
      }
      
      endpoint = `api/${pluralName}`
      console.log('[STRAPI PUBLISH] Converted to endpoint:', endpoint)
    }
  } else if (!endpoint.startsWith('api/')) {
    // If not already in correct format, assume it's ready to use
    endpoint = `api/${endpoint}`
    console.log('[STRAPI PUBLISH] Added api/ prefix:', endpoint)
  }

  const url = `${cleanUrl}/${endpoint}`
  
  console.log('[STRAPI PUBLISH] Publishing to:', url)
  console.log('[STRAPI PUBLISH] Content type:', contentType)
  console.log('[STRAPI PUBLISH] Endpoint:', endpoint)

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
  }

  console.log('[STRAPI PUBLISH] Article data:', JSON.stringify(articleData, null, 2))

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(articleData)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[STRAPI PUBLISH] Error response:', response.status, errorText)
    console.error('[STRAPI PUBLISH] Request URL:', url)
    console.error('[STRAPI PUBLISH] Request headers:', {
      'Authorization': `Bearer ${apiToken ? apiToken.substring(0, 10) + '...' : 'missing'}`,
      'Content-Type': 'application/json'
    })
    
    if (response.status === 401) {
      throw new Error('Authentication failed. Please check your API token.')
    } else if (response.status === 404) {
      throw new Error(`Content type endpoint not found: ${endpoint}. Check if the content type exists in Strapi.`)
    } else if (response.status === 400) {
      throw new Error(`Invalid data format: ${errorText}`)
    } else if (response.status === 405) {
      throw new Error(`Method not allowed for endpoint: ${endpoint}. The Strapi endpoint may not support POST requests or the content type may be incorrect.`)
    } else {
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
  }

  const result = await response.json()
  console.log('[STRAPI PUBLISH] Success response:', result)

  // Extract the document ID from the response
  const documentId = result.data?.documentId || result.data?.id
  
  if (!documentId) {
    throw new Error('No document ID returned from Strapi')
  }

  return documentId.toString()
}

function formatContentForStrapi(content: string): any {
  // For rich text fields, we need to convert markdown to Strapi's rich text format
  // For now, we'll use a simple conversion. In production, you might want a more sophisticated parser
  
  // Split content into blocks
  const lines = content.split('\n')
  const blocks: any[] = []
  
  for (const line of lines) {
    if (line.trim() === '') continue
    
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
      })
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
      })
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
      })
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
      })
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
      })
    }
  }
  
  return blocks
}