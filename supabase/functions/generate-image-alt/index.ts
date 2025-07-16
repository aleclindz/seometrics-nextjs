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

  // Only process if image tags are enabled
  if (!website.enable_image_tags) {
    return new Response(
      JSON.stringify({}),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const altTags: Record<string, string> = {}

  // Process each image
  for (const imageUrl of images) {
    try {
      // Check if alt-tag already exists
      const { data: existingTag } = await supabase
        .from('alt_tags')
        .select('alt_text')
        .eq('website_token', websiteToken)
        .eq('image_url', imageUrl)
        .single()

      if (existingTag) {
        altTags[imageUrl] = existingTag.alt_text
        continue
      }

      // Generate alt-tag using AI
      const generatedAltText = await generateAltText(imageUrl, website.language || 'en')
      
      // Store in database
      const { error: insertError } = await supabase
        .from('alt_tags')
        .upsert({
          website_token: websiteToken,
          image_url: imageUrl,
          alt_text: generatedAltText,
        })

      if (insertError) {
        console.error('Error inserting alt-tag:', insertError)
        altTags[imageUrl] = 'Image' // fallback
      } else {
        altTags[imageUrl] = generatedAltText
      }

    } catch (error) {
      console.error('Error processing image:', imageUrl, error)
      altTags[imageUrl] = 'Image' // fallback
    }
  }

  // Update website image tags count
  const { data: totalTags } = await supabase
    .from('alt_tags')
    .select('id')
    .eq('website_token', websiteToken)

  const { error: updateError } = await supabase
    .from('websites')
    .update({ 
      image_tags: totalTags?.length || 0
    })
    .eq('website_token', websiteToken)

  if (updateError) {
    console.error('Error updating website image tags count:', updateError)
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
      return altText.substring(0, 122) + '...'
    }

    return altText
  } catch (error) {
    console.error('Error generating alt text:', error)
    
    // Generate basic alt text from filename as fallback
    const filename = imageUrl.split('/').pop() || ''
    const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '')
    const cleanName = nameWithoutExtension
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()

    return cleanName ? `Image of ${cleanName}` : 'Image'
  }
}