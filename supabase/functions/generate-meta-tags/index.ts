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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestData: MetaTagsRequest = await req.json()

    // Handle smart.js format
    if (requestData.url && requestData.id) {
      return await handleSmartJsRequest(requestData.url, requestData.id, supabase)
    }

    // Handle direct content format (legacy)
    if (requestData.content && requestData.language) {
      return await handleDirectContentRequest(requestData.content, requestData.language)
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request format' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-meta-tags function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleSmartJsRequest(pageUrl: string, websiteToken: string, supabase: any) {
  // Verify website token exists
  const { data: website, error: websiteError } = await supabase
    .from('websites')
    .select('*')
    .eq('website_token', websiteToken)
    .single()

  if (websiteError || !website) {
    return new Response(
      JSON.stringify({ error: 'Invalid website token' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Only process if meta tags are enabled
  if (!website.enable_meta_tags) {
    return new Response(
      JSON.stringify({ title: '', description: '' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Check if meta tags already exist for this page
    const { data: existingTags } = await supabase
      .from('meta_tags')
      .select('*')
      .eq('website_token', websiteToken)
      .eq('page_url', pageUrl)
      .single()

    if (existingTags) {
      return new Response(
        JSON.stringify({ 
          title: existingTags.meta_title || '', 
          description: existingTags.meta_description || '' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch page content
    const pageContent = await fetchPageContent(pageUrl)
    
    // Generate meta tags using AI
    const { title, description } = await generateMetaTags(pageContent, website.language || 'en')
    
    // Store in database
    const { error: insertError } = await supabase
      .from('meta_tags')
      .upsert({
        website_token: websiteToken,
        page_url: pageUrl,
        meta_title: title,
        meta_description: description,
      })

    if (insertError) {
      console.error('Error inserting meta tags:', insertError)
    }

    // Update website meta tags count
    const { data: totalTags } = await supabase
      .from('meta_tags')
      .select('id')
      .eq('website_token', websiteToken)

    await supabase
      .from('websites')
      .update({ 
        meta_tags: totalTags?.length || 0
      })
      .eq('website_token', websiteToken)

    return new Response(
      JSON.stringify({ title, description }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing meta tags:', error)
    return new Response(
      JSON.stringify({ title: '', description: '' }),
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
    const response = await fetch(url)
    const html = await response.text()
    
    // Extract text content from HTML
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return textContent.substring(0, 1000)
  } catch (error) {
    console.error('Error fetching page content:', error)
    return ''
  }
}

async function generateMetaTags(content: string, language: string): Promise<{title: string, description: string}> {
  try {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!,
    })

    // Clean and truncate content
    const cleanContent = content.replace(/<[^>]*>/g, '').substring(0, 1000)

    const prompt = `Based on the following webpage content, create an SEO-optimized meta title (max 60 characters) and meta description (max 155 characters) in ${language} language that accurately represents the content and encourages clicks:

Content: ${cleanContent}

Provide the output in this exact format:
Title: [meta title]
Description: [meta description]`

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

    // Extract title and description using regex
    const titleMatch = output.match(/Title:\s*(.+)$/m)
    const descMatch = output.match(/Description:\s*(.+)$/m)

    let metaTitle = titleMatch?.[1]?.trim() || ''
    let metaDescription = descMatch?.[1]?.trim() || ''

    // Validate and trim character limits
    if (metaTitle.length > 60) {
      metaTitle = metaTitle.substring(0, 57) + '...'
    }
    
    if (metaDescription.length > 155) {
      metaDescription = metaDescription.substring(0, 152) + '...'
    }

    return { title: metaTitle, description: metaDescription }

  } catch (error) {
    console.error('Error generating meta tags:', error)
    return { title: '', description: '' }
  }
}