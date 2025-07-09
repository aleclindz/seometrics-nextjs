import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const body = await request.json()
    const { imageUrl, language } = body

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('generate-image-alt', {
      body: {
        imageUrl,
        language
      }
    })

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Image alt text generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate image alt text' },
      { status: 500 }
    )
  }
}