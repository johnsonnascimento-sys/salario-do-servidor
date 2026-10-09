import { createClient } from '@supabase/supabase-js'
import { validatePublicSupabaseConfig } from './publicSupabaseConfig'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const publicConfig = validatePublicSupabaseConfig(supabaseUrl, supabaseAnonKey)
export const supabase = createClient(publicConfig.url, publicConfig.key)
