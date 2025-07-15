import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const body = await request.json()
    const { content, language } = body

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('generate-meta-tags', {
      body: {
        content,
        language
      }
    })

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Meta tags generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate meta tags' },
      { status: 500 }
    )
  }
}