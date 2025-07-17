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
  userToken: string
  siteId?: number
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

    const { topic, language, tone, searchkeyword, faqs, youtube, tables, keytakes, bold, blockquotes, userToken, siteId }: ArticleRequest = await req.json()

    // Validate required fields
    if (!topic || !userToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: topic, userToken' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check quota before generating article
    const quotaCheck = await checkQuota(supabase, userToken, siteId)
    if (!quotaCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Quota exceeded',
          message: `You have reached your monthly limit of ${quotaCheck.limit} articles. Current usage: ${quotaCheck.currentUsage}`,
          quota: quotaCheck
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

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

    // Calculate article metrics
    const wordCount = article.replace(/<[^>]*>/g, '').split(/\s+/).length
    const readabilityScore = calculateReadabilityScore(article)

    // Save article to database
    const { data: savedArticle, error: saveError } = await supabase
      .from('articles')
      .insert({
        user_token: userToken,
        title: topic,
        content: article,
        language: language,
        settings: {
          tone,
          searchkeyword,
          faqs,
          youtube,
          tables,
          keytakes,
          bold,
          blockquotes
        },
        site_id: siteId,
        word_count: wordCount,
        readability_score: readabilityScore,
        status: 'generated'
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving article:', saveError)
      // Continue without failing - article is still generated
    }

    // Track usage after successful generation
    await trackUsage(supabase, userToken, 'article', siteId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        article,
        outline,
        metrics: {
          wordCount,
          readabilityScore
        },
        quota: await checkQuota(supabase, userToken, siteId),
        articleId: savedArticle?.id
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

// Helper function to check quota
async function checkQuota(supabase: any, userToken: string, siteId?: number) {
  try {
    // Get user plan
    const { data: userPlan, error: planError } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_token', userToken)
      .single()

    if (planError || !userPlan) {
      return { allowed: false, currentUsage: 0, limit: 0, remaining: 0, tier: 'starter' }
    }

    // Check if subscription is active
    if (userPlan.status !== 'active') {
      return { allowed: false, currentUsage: 0, limit: 0, remaining: 0, tier: userPlan.tier }
    }

    // Get current usage for this month
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('count')
      .eq('user_token', userToken)
      .eq('resource_type', 'article')
      .eq('month_year', currentMonth)

    const currentUsage = usage?.reduce((sum: number, item: any) => sum + item.count, 0) || 0
    const limit = userPlan.posts_allowed
    const allowed = limit === -1 || currentUsage < limit
    const remaining = limit === -1 ? Infinity : Math.max(0, limit - currentUsage)

    return {
      allowed,
      currentUsage,
      limit,
      remaining,
      tier: userPlan.tier
    }
  } catch (error) {
    console.error('Error checking quota:', error)
    return { allowed: false, currentUsage: 0, limit: 0, remaining: 0, tier: 'starter' }
  }
}

// Helper function to track usage
async function trackUsage(supabase: any, userToken: string, resourceType: string, siteId?: number) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7)
    
    // Check if record exists
    const { data: existing } = await supabase
      .from('usage_tracking')
      .select('id, count')
      .eq('user_token', userToken)
      .eq('resource_type', resourceType)
      .eq('month_year', currentMonth)
      .maybeSingle()

    if (existing) {
      // Update existing record
      await supabase
        .from('usage_tracking')
        .update({ count: existing.count + 1 })
        .eq('id', existing.id)
    } else {
      // Create new record
      await supabase
        .from('usage_tracking')
        .insert({
          user_token: userToken,
          site_id: siteId || null,
          resource_type: resourceType,
          month_year: currentMonth,
          count: 1
        })
    }
  } catch (error) {
    console.error('Error tracking usage:', error)
  }
}

// Helper function to calculate readability score (simplified)
function calculateReadabilityScore(text: string): number {
  // Remove HTML tags
  const plainText = text.replace(/<[^>]*>/g, '')
  
  // Count sentences (rough estimate)
  const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0).length
  
  // Count words
  const words = plainText.split(/\s+/).filter(w => w.length > 0).length
  
  // Count syllables (rough estimate)
  const syllables = plainText.toLowerCase().split(/\s+/).reduce((count, word) => {
    return count + Math.max(1, word.replace(/[^aeiou]/g, '').length)
  }, 0)
  
  // Flesch Reading Ease formula
  if (sentences === 0 || words === 0) return 0
  
  const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words))
  
  // Convert to grade level (approximate)
  return Math.max(1, Math.min(20, Math.round((100 - score) / 5)))
}