import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ArticleRequest {
  topic: string
  language: string
  tone: number
  searchkeyword?: string
  faqs: boolean
  youtube: boolean
  tables: boolean
  keytakes: boolean
  bold: boolean
  blockquotes: boolean
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

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { topic, language, tone, searchkeyword, faqs, youtube, tables, keytakes, bold, blockquotes }: ArticleRequest = await req.json()

    // Generate article outline
    const outlinePrompt = `Write 6-8 subheadings for an article about: "${topic}". Use ${language} language.`
    
    const outlineResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an expert content writer. Create engaging article outlines.' },
        { role: 'user', content: outlinePrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    })

    const outline = outlineResponse.choices[0].message.content

    // Generate full article based on outline
    let stylePrompt = ''
    switch (tone) {
      case 1:
        stylePrompt = 'Use a first-person narrator.'
        break
      case 2:
        stylePrompt = 'Use a first-person narrator & include personal anecdotes.'
        break
      case 3:
        stylePrompt = 'Use a third-person narrator.'
        break
      default:
        stylePrompt = 'Write in a professional, informative style.'
    }

    const articlePrompt = `Write a comprehensive article based on the following outline. 
    Write in ${language} language. ${stylePrompt}
    Write 2-3 paragraphs for each section with varied language.
    
    Outline: ${outline}`

    const articleResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert content writer who creates detailed, engaging articles.' },
        { role: 'user', content: articlePrompt }
      ],
      temperature: 0.1,
      max_tokens: 3000
    })

    let article = articleResponse.choices[0].message.content || ''

    // Format article with HTML
    article = article.replace(/\n\n/g, '<br><br>')
    article = article.replace(/\n/g, '<br>')

    // Add H2 tags for sections
    const h2Pattern = /\b([IVX]+)\.\s*(.*?)(?=<br>)/gs
    article = article.replace(h2Pattern, '<h2>$1. $2</h2>')

    // Generate FAQ section if requested
    if (faqs) {
      const faqPrompt = `Write 5 general FAQs about "${topic}". Use ${language} language. Use <h3> tags for questions.`
      
      const faqResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Create helpful FAQ sections for articles.' },
          { role: 'user', content: faqPrompt }
        ],
        temperature: 0,
        max_tokens: 1000
      })

      const faqs = faqResponse.choices[0].message.content
      article += `<br><br><h2>FAQs</h2><br>${faqs}`
    }

    // Generate key takeaways if requested
    if (keytakes) {
      const takeawaysPrompt = `Write 5 key takeaways about "${topic}" in ${language} language as bullet points with leading '-'.`
      
      const takeawaysResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Create concise key takeaways for articles.' },
          { role: 'user', content: takeawaysPrompt }
        ],
        temperature: 0,
        max_tokens: 500
      })

      const takeaways = takeawaysResponse.choices[0].message.content
      const formattedTakeaways = takeaways?.split('\n')
        .filter(line => line.trim())
        .map(line => `<li>${line.replace(/^-\s*/, '')}</li>`)
        .join('')

      article = `<h3>Key Takeaways</h3><ul>${formattedTakeaways}</ul><br>` + article
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        article,
        outline 
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