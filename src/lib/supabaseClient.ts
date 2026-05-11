import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. ' +
    'Set them in your .env file locally, or in your hosting platform dashboard for production.'
  )
}

// Reuse the client across hot reloads in development
declare global {
  interface Window { __SUPABASE_CLIENT__?: SupabaseClient }
}

let supabaseClient: SupabaseClient

if (typeof window !== 'undefined' && window.__SUPABASE_CLIENT__) {
  supabaseClient = window.__SUPABASE_CLIENT__
} else {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  if (typeof window !== 'undefined') {
    window.__SUPABASE_CLIENT__ = supabaseClient
  }
}

export const supabase = supabaseClient
