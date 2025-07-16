import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import OpenAI from 'https://esm.sh/openai@4.56.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImageAltRequest {
  imageUrl?: string
  language?: string
  // Smart.js format
  id?: string
  images?: string[]
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

    const requestData: ImageAltRequest = await req.json()

    // Handle smart.js format (multiple images)
    if (requestData.id && requestData.images) {
      return await handleSmartJsRequest(requestData.id, requestData.images, supabase)
    }

    // Handle single image format (legacy)
    if (requestData.imageUrl && requestData.language) {
      return await handleSingleImageRequest(requestData.imageUrl, requestData.language)
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request format' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-image-alt function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleSmartJsRequest(websiteToken: string, images: string[], supabase: any) {
  console.log(`[ALT-TAGS] Processing request for website token: ${websiteToken}`)
  console.log(`[ALT-TAGS] Number of images to process: ${images.length}`)
  console.log(`[ALT-TAGS] Images: ${JSON.stringify(images)}`)

  // Verify website token exists
  const { data: website, error: websiteError } = await supabase
    .from('websites')
    .select('*')
    .eq('website_token', websiteToken)
    .single()

  if (websiteError || !website) {
    console.error(`[ALT-TAGS] Website not found for token: ${websiteToken}`, websiteError)
    return new Response(
      JSON.stringify({ error: 'Invalid website token', details: websiteError }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[ALT-TAGS] Found website: ${website.domain}, image_tags_enabled: ${website.enable_image_tags}`)

  // Only process if image tags are enabled
  if (!website.enable_image_tags) {
    console.log(`[ALT-TAGS] Image tags disabled for website: ${website.domain}`)
    return new Response(
      JSON.stringify({ message: 'Image tags disabled for this website' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const altTags: Record<string, string> = {}
  let processedCount = 0
  let generatedCount = 0
  let existingCount = 0
  let errorCount = 0

  // Process each image
  for (const imageUrl of images) {
    try {
      console.log(`[ALT-TAGS] Processing image: ${imageUrl}`)
      
      // Check if alt-tag already exists
      const { data: existingTag, error: selectError } = await supabase
        .from('alt_tags')
        .select('alt_text')
        .eq('website_token', websiteToken)
        .eq('image_url', imageUrl)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
        console.error(`[ALT-TAGS] Error checking existing tag for ${imageUrl}:`, selectError)
      }

      if (existingTag) {
        console.log(`[ALT-TAGS] Found existing alt-tag for ${imageUrl}: ${existingTag.alt_text}`)
        altTags[imageUrl] = existingTag.alt_text
        existingCount++
        processedCount++
        continue
      }

      console.log(`[ALT-TAGS] Generating new alt-tag for ${imageUrl}`)
      
      // Generate alt-tag using AI
      const generatedAltText = await generateAltText(imageUrl, website.language || 'en')
      console.log(`[ALT-TAGS] Generated alt-tag for ${imageUrl}: ${generatedAltText}`)
      
      // Store in database
      const { error: insertError } = await supabase
        .from('alt_tags')
        .upsert({
          website_token: websiteToken,
          image_url: imageUrl,
          alt_text: generatedAltText,
        })

      if (insertError) {
        console.error(`[ALT-TAGS] Error inserting alt-tag for ${imageUrl}:`, insertError)
        altTags[imageUrl] = 'Image' // fallback
        errorCount++
      } else {
        console.log(`[ALT-TAGS] Successfully stored alt-tag for ${imageUrl}`)
        altTags[imageUrl] = generatedAltText
        generatedCount++
      }

      processedCount++

    } catch (error) {
      console.error(`[ALT-TAGS] Error processing image ${imageUrl}:`, error)
      altTags[imageUrl] = 'Image' // fallback
      errorCount++
      processedCount++
    }
  }

  console.log(`[ALT-TAGS] Processing complete. Processed: ${processedCount}, Generated: ${generatedCount}, Existing: ${existingCount}, Errors: ${errorCount}`)

  // Update website image tags count
  const { data: totalTags, error: countError } = await supabase
    .from('alt_tags')
    .select('id')
    .eq('website_token', websiteToken)

  if (countError) {
    console.error(`[ALT-TAGS] Error counting total tags:`, countError)
  } else {
    console.log(`[ALT-TAGS] Total alt-tags for website: ${totalTags?.length || 0}`)
  }

  const { error: updateError } = await supabase
    .from('websites')
    .update({ 
      image_tags: totalTags?.length || 0
    })
    .eq('website_token', websiteToken)

  if (updateError) {
    console.error(`[ALT-TAGS] Error updating website image tags count:`, updateError)
  } else {
    console.log(`[ALT-TAGS] Updated website image tags count to: ${totalTags?.length || 0}`)
  }

  return new Response(
    JSON.stringify(altTags),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleSingleImageRequest(imageUrl: string, language: string) {
  const openai = new OpenAI({
    apiKey: Deno.env.get('OPENAI_API_KEY')!,
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Please provide a concise, descriptive alt text for this image that would be suitable for accessibility purposes. Keep it under 125 characters and use ${language} language.`
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          }
        ]
      }
    ],
    max_tokens: 100
  })

  const altText = response.choices[0].message.content?.trim() || ''

  // Validate character limit
  if (altText.length > 125) {
    throw new Error(`Alt text too long: ${altText.length} characters (max 125)`)
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      alt_text: altText
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function generateAltText(imageUrl: string, language: string): Promise<string> {
  try {
    console.log(`[ALT-TAGS] Generating alt text for ${imageUrl} in ${language}`)
    
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!,
    })

    console.log(`[ALT-TAGS] Sending request to OpenAI for image analysis`)

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please provide a concise, descriptive alt text for this image that would be suitable for accessibility purposes. Keep it under 125 characters and use ${language} language.`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 100
    })

    const altText = response.choices[0].message.content?.trim() || ''
    console.log(`[ALT-TAGS] OpenAI generated alt text: "${altText}" (${altText.length} chars)`)

    // Validate character limit
    if (altText.length > 125) {
      const truncated = altText.substring(0, 122) + '...'
      console.log(`[ALT-TAGS] Truncated alt text to: "${truncated}"`)
      return truncated
    }

    return altText
  } catch (error) {
    console.error(`[ALT-TAGS] Error generating alt text for ${imageUrl}:`, error)
    
    // Generate basic alt text from filename as fallback
    const filename = imageUrl.split('/').pop() || ''
    const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '')
    const cleanName = nameWithoutExtension
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()

    const fallbackAlt = cleanName ? `Image of ${cleanName}` : 'Image'
    console.log(`[ALT-TAGS] Using fallback alt text: "${fallbackAlt}"`)
    
    return fallbackAlt
  }
}