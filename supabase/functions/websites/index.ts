import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface WebsiteRequest {
  domain: string
  language: string
  enableMetaTags: boolean
  enableImageTags: boolean
}

// Simple UUID v4 generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase with service role key for full access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT token
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract JWT token
    const token = authorization.replace('Bearer ', '')
    
    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Authenticated user:', user.id, user.email)

    if (req.method === 'GET') {
      // Get user's websites
      
      // First, get or create user profile
      let { data: userProfile, error: userError } = await supabase
        .from('login_users')
        .select('token')
        .eq('auth_user_id', user.id)
        .single()

      if (userError || !userProfile) {
        // Create user profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('login_users')
          .insert({
            email: user.email || '',
            auth_user_id: user.id,
            token: generateUUID()
          })
          .select('token')
          .single()

        if (createError) {
          console.error('Failed to create user profile:', createError)
          return new Response(
            JSON.stringify({ error: 'Failed to create user profile' }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        userProfile = newProfile
      }

      // Get user's websites
      const { data: websites, error: websitesError } = await supabase
        .from('websites')
        .select('*')
        .eq('user_token', userProfile.token)
        .order('created_at', { ascending: false })

      if (websitesError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch websites' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ websites }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    if (req.method === 'POST') {
      // Create new website
      const { domain, language, enableMetaTags, enableImageTags }: WebsiteRequest = await req.json()

      // Validate domain
      if (!domain || typeof domain !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Domain is required' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
      if (!domainPattern.test(domain)) {
        return new Response(
          JSON.stringify({ error: 'Invalid domain format' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Get or create user profile
      let { data: userProfile, error: userError } = await supabase
        .from('login_users')
        .select('token')
        .eq('auth_user_id', user.id)
        .single()

      if (userError || !userProfile) {
        // Create user profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('login_users')
          .insert({
            email: user.email || '',
            auth_user_id: user.id,
            token: generateUUID()
          })
          .select('token')
          .single()

        if (createError) {
          console.error('Failed to create user profile:', createError)
          return new Response(
            JSON.stringify({ error: 'Failed to create user profile' }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        userProfile = newProfile
      }

      // Check if domain already exists for this user
      const { data: existingWebsite } = await supabase
        .from('websites')
        .select('id')
        .eq('domain', domain)
        .eq('user_token', userProfile.token)
        .single()

      if (existingWebsite) {
        return new Response(
          JSON.stringify({ error: 'Domain already exists' }),
          { 
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Create website
      const { data: website, error: insertError } = await supabase
        .from('websites')
        .insert({
          user_token: userProfile.token,
          domain,
          language: language || 'english',
          enable_meta_tags: enableMetaTags ?? true,
          enable_image_tags: enableImageTags ?? true,
          meta_tags: 0,
          image_tags: 0
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating website:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to create website' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ website }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in websites function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})