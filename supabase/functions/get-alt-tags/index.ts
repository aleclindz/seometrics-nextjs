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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const websiteToken = url.searchParams.get('token')

    if (!websiteToken) {
      return new Response(
        JSON.stringify({ error: 'Website token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Get all alt-tags for this website
    const { data: altTags, error: altTagsError } = await supabase
      .from('alt_tags')
      .select('*')
      .eq('website_token', websiteToken)
      .order('created_at', { ascending: false })

    if (altTagsError) {
      console.error('Error fetching alt tags:', altTagsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch alt tags' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        website: {
          domain: website.url,
          token: website.website_token,
          enable_image_tags: website.enable_image_tags,
          language: website.language
        },
        alt_tags: altTags || [],
        total_count: altTags?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-alt-tags function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})