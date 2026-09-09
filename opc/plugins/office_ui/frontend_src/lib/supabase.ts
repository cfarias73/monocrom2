import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://pgqcleckswtztriqqmil.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncWNsZWNrc3d0enRyaXFxbWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Nzk0NzMsImV4cCI6MjEwNDU1NTQ3M30.i1go2K3SlnRFtB5HThUerwBuQ-ufNhh4B05F5vHag4s'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
