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
      // Disable automatic token refresh to prevent tab switching issues
      autoRefreshToken: false, // DISABLED - we'll handle session expiry manually
      persistSession: true,
      detectSessionInUrl: false, // Disable URL session detection to prevent router issues
      flowType: 'pkce', // Use PKCE flow for better security without refresh tokens
    }
  })

// Legacy export for backward compatibility
export const supabase = createClientComponentClient()