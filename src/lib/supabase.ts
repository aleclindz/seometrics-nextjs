import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const createClientComponentClient = () => 
  createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Keep auto refresh but we'll ignore the events to prevent tab switching issues
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Disable URL session detection to prevent router issues
      flowType: 'pkce', // Use PKCE flow for better security
    }
  })

// Legacy export for backward compatibility
export const supabase = createClientComponentClient()