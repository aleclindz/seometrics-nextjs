import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MetaTagsRequest {
  content: string
  language: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!,
    })

    const { content, language }: MetaTagsRequest = await req.json()

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

    const metaTitle = titleMatch?.[1]?.trim() || ''
    const metaDescription = descMatch?.[1]?.trim() || ''

    // Validate character limits
    if (metaTitle.length > 60) {
      throw new Error(`Meta title too long: ${metaTitle.length} characters (max 60)`)
    }
    
    if (metaDescription.length > 155) {
      throw new Error(`Meta description too long: ${metaDescription.length} characters (max 155)`)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        meta_title: metaTitle,
        meta_description: metaDescription,
        raw_response: output
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})