import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MetaTagsRequest {
  content?: string
  language?: string
  // Smart.js format
  url?: string
  id?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[META-TAGS] Function called with method:', req.method)
    console.log('[META-TAGS] Request headers:', Object.fromEntries(req.headers.entries()))
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestData: MetaTagsRequest = await req.json()
    console.log('[META-TAGS] Request data:', requestData)

    // Handle smart.js format
    if (requestData.url && requestData.id) {
      console.log('[META-TAGS] Processing smart.js request for URL:', requestData.url, 'ID:', requestData.id)
      return await handleSmartJsRequest(requestData.url, requestData.id, supabase)
    }

    // Handle direct content format (legacy)
    if (requestData.content && requestData.language) {
      console.log('[META-TAGS] Processing direct content request, language:', requestData.language)
      return await handleDirectContentRequest(requestData.content, requestData.language)
    }

    console.log('[META-TAGS] Invalid request format - missing required fields')
    return new Response(
      JSON.stringify({ error: 'Invalid request format' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[META-TAGS] Error in generate-meta-tags function:', error)
    console.error('[META-TAGS] Error stack:', error.stack)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleSmartJsRequest(pageUrl: string, websiteToken: string, supabase: any) {
  console.log(`[META-TAGS] Processing request for website token: ${websiteToken}`)
  console.log(`[META-TAGS] Page URL: ${pageUrl}`)

  // Verify website token exists
  const { data: website, error: websiteError } = await supabase
    .from('websites')
    .select('*')
    .eq('website_token', websiteToken)
    .single()

  if (websiteError || !website) {
    console.error(`[META-TAGS] Website not found for token: ${websiteToken}`, websiteError)
    return new Response(
      JSON.stringify({ error: 'Invalid website token', details: websiteError }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[META-TAGS] Found website: ${website.domain}, meta_tags_enabled: ${website.enable_meta_tags}`)

  // Only process if meta tags are enabled
  if (!website.enable_meta_tags) {
    console.log(`[META-TAGS] Meta tags disabled for website: ${website.domain}`)
    return new Response(
      JSON.stringify({ title: '', description: '', message: 'Meta tags disabled for this website' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Check if meta tags already exist for this page
    const { data: existingTags, error: selectError } = await supabase
      .from('meta_tags')
      .select('*')
      .eq('website_token', websiteToken)
      .eq('page_url', pageUrl)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      console.error(`[META-TAGS] Error checking existing tags for ${pageUrl}:`, selectError)
    }

    if (existingTags) {
      console.log(`[META-TAGS] Found existing meta tags for ${pageUrl}`)
      console.log(`[META-TAGS] Title: ${existingTags.meta_title}`)
      console.log(`[META-TAGS] Description: ${existingTags.meta_description}`)
      return new Response(
        JSON.stringify({ 
          title: existingTags.meta_title || '', 
          description: existingTags.meta_description || '' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[META-TAGS] No existing meta tags found, generating new ones`)

    // Fetch page content
    console.log(`[META-TAGS] Fetching page content from: ${pageUrl}`)
    const pageContent = await fetchPageContent(pageUrl)
    
    if (!pageContent) {
      console.error(`[META-TAGS] Failed to fetch page content from: ${pageUrl}`)
      return new Response(
        JSON.stringify({ title: '', description: '', error: 'Failed to fetch page content' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[META-TAGS] Fetched ${pageContent.length} characters of content`)
    console.log(`[META-TAGS] Content preview: ${pageContent.substring(0, 200)}...`)
    
    // Generate meta tags using AI
    console.log(`[META-TAGS] Generating meta tags using OpenAI`)
    const { title, description } = await generateMetaTags(pageContent, website.language || 'en')
    
    console.log(`[META-TAGS] Generated meta tags:`)
    console.log(`[META-TAGS] Title: ${title}`)
    console.log(`[META-TAGS] Description: ${description}`)

    if (!title && !description) {
      console.error(`[META-TAGS] Failed to generate meta tags for ${pageUrl}`)
      return new Response(
        JSON.stringify({ title: '', description: '', error: 'Failed to generate meta tags' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Store in database
    console.log(`[META-TAGS] Storing meta tags in database`)
    const { error: insertError } = await supabase
      .from('meta_tags')
      .upsert({
        website_token: websiteToken,
        page_url: pageUrl,
        meta_title: title,
        meta_description: description,
      })

    if (insertError) {
      console.error(`[META-TAGS] Error inserting meta tags:`, insertError)
    } else {
      console.log(`[META-TAGS] Successfully stored meta tags in database`)
    }

    // Update website meta tags count
    const { data: totalTags, error: countError } = await supabase
      .from('meta_tags')
      .select('id')
      .eq('website_token', websiteToken)

    if (countError) {
      console.error(`[META-TAGS] Error counting total tags:`, countError)
    } else {
      console.log(`[META-TAGS] Total meta tags for website: ${totalTags?.length || 0}`)
    }

    const { error: updateError } = await supabase
      .from('websites')
      .update({ 
        meta_tags: totalTags?.length || 0
      })
      .eq('website_token', websiteToken)

    if (updateError) {
      console.error(`[META-TAGS] Error updating website meta tags count:`, updateError)
    } else {
      console.log(`[META-TAGS] Updated website meta tags count to: ${totalTags?.length || 0}`)
    }

    return new Response(
      JSON.stringify({ title, description }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(`[META-TAGS] Error processing meta tags for ${pageUrl}:`, error)
    return new Response(
      JSON.stringify({ title: '', description: '', error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleDirectContentRequest(content: string, language: string) {
  const { title, description } = await generateMetaTags(content, language)

  return new Response(
    JSON.stringify({ 
      success: true,
      meta_title: title,
      meta_description: description
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function fetchPageContent(url: string): Promise<string> {
  try {
    console.log(`[META-TAGS] Fetching content from URL: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SEO-Metrics-Bot/1.0 (Auto-tagging system)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })

    if (!response.ok) {
      console.error(`[META-TAGS] HTTP error when fetching ${url}: ${response.status} ${response.statusText}`)
      return ''
    }

    console.log(`[META-TAGS] Successfully fetched ${url}, status: ${response.status}`)
    
    const html = await response.text()
    console.log(`[META-TAGS] Retrieved ${html.length} characters of HTML`)
    
    // Extract text content from HTML
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    console.log(`[META-TAGS] Extracted ${textContent.length} characters of text content`)
    
    const truncatedContent = textContent.substring(0, 1000)
    console.log(`[META-TAGS] Truncated to ${truncatedContent.length} characters for AI processing`)
    
    return truncatedContent
  } catch (error) {
    console.error(`[META-TAGS] Error fetching page content from ${url}:`, error)
    return ''
  }
}

async function generateMetaTags(content: string, language: string): Promise<{title: string, description: string}> {
  try {
    console.log(`[META-TAGS] Generating meta tags for ${content.length} characters of content in ${language}`)
    
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!,
    })

    // Clean and truncate content
    const cleanContent = content.replace(/<[^>]*>/g, '').substring(0, 1000)
    console.log(`[META-TAGS] Clean content (${cleanContent.length} chars): ${cleanContent.substring(0, 100)}...`)

    const prompt = `Based on the following webpage content, create an SEO-optimized meta title (max 60 characters) and meta description (max 155 characters) in ${language} language that accurately represents the content and encourages clicks:

Content: ${cleanContent}

Provide the output in this exact format:
Title: [meta title]
Description: [meta description]`

    console.log(`[META-TAGS] Sending request to OpenAI with ${prompt.length} character prompt`)

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'You are an SEO expert. Create compelling meta tags that follow SEO best practices and character limits.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      max_tokens: 200
    })

    const output = response.choices[0].message.content || ''
    console.log(`[META-TAGS] OpenAI response: ${output}`)

    // Extract title and description using regex
    const titleMatch = output.match(/Title:\s*(.+)$/m)
    const descMatch = output.match(/Description:\s*(.+)$/m)

    let metaTitle = titleMatch?.[1]?.trim() || ''
    let metaDescription = descMatch?.[1]?.trim() || ''

    console.log(`[META-TAGS] Extracted title: "${metaTitle}" (${metaTitle.length} chars)`)
    console.log(`[META-TAGS] Extracted description: "${metaDescription}" (${metaDescription.length} chars)`)

    // Validate and trim character limits
    if (metaTitle.length > 60) {
      const originalTitle = metaTitle
      metaTitle = metaTitle.substring(0, 57) + '...'
      console.log(`[META-TAGS] Truncated title from ${originalTitle.length} to ${metaTitle.length} chars`)
    }
    
    if (metaDescription.length > 155) {
      const originalDesc = metaDescription
      metaDescription = metaDescription.substring(0, 152) + '...'
      console.log(`[META-TAGS] Truncated description from ${originalDesc.length} to ${metaDescription.length} chars`)
    }

    console.log(`[META-TAGS] Final meta tags - Title: "${metaTitle}", Description: "${metaDescription}"`)

    return { title: metaTitle, description: metaDescription }

  } catch (error) {
    console.error(`[META-TAGS] Error generating meta tags:`, error)
    return { title: '', description: '' }
  }
}