import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const body = await request.json()
    const { topic, language, tone, searchkeyword, faqs, youtube, tables, keytakes, bold, blockquotes } = body

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('generate-article', {
      body: {
        topic,
        language,
        tone,
        searchkeyword,
        faqs,
        youtube,
        tables,
        keytakes,
        bold,
        blockquotes
      }
    })

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Article generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate article' },
      { status: 500 }
    )
  }
}