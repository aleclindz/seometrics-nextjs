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

    // Get all meta-tags for this website
    const { data: metaTags, error: metaTagsError } = await supabase
      .from('meta_tags')
      .select('*')
      .eq('website_token', websiteToken)
      .order('created_at', { ascending: false })

    if (metaTagsError) {
      console.error('Error fetching meta tags:', metaTagsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch meta tags' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        website: {
          domain: website.url,
          token: website.website_token,
          enable_meta_tags: website.enable_meta_tags,
          language: website.language
        },
        meta_tags: metaTags || [],
        total_count: metaTags?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-meta-tags function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})