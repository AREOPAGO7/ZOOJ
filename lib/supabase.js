import { createClient } from '@supabase/supabase-js'

// ⬇️ Get these from your Supabase project settings (Project URL + anon key)
const SUPABASE_URL = 'https://xrgwsykeswhdtqwsyrbh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZ3dzeWtlc3doZHRxd3N5cmJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTA5MjEsImV4cCI6MjA3MTE4NjkyMX0.jituJbUd0KWkElsn5-Laf96_GBjTjAPDa5kRFdO5xr0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})
