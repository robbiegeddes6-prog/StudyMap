import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔧 SUPABASE CLIENT INITIALIZATION')
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('VITE_SUPABASE_ANON_KEY exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)
console.log('All env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')))
console.log('SUPABASE URL:', supabaseUrl)
console.log('SUPABASE KEY:', supabaseAnonKey ? '***' + supabaseAnonKey.slice(-4) : 'MISSING')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY')
}

// Prevent duplicate client creation during hot reload
let supabaseClient: SupabaseClient | undefined

declare global {
  interface Window {
    __SUPABASE_CLIENT__?: SupabaseClient
  }
}

if (typeof window !== 'undefined' && window.__SUPABASE_CLIENT__) {
  console.log('🔄 Reusing existing Supabase client (hot reload)')
  supabaseClient = window.__SUPABASE_CLIENT__
} else {
  console.log('✅ Creating new Supabase client with URL:', supabaseUrl)
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  if (typeof window !== 'undefined') {
    window.__SUPABASE_CLIENT__ = supabaseClient
    console.log('💾 Supabase client stored in window for hot reload protection')
  }
}

console.log('🚀 Supabase client ready for use')
export const supabase = supabaseClient
