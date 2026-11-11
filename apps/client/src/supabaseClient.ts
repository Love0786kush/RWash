import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ehwmwqqetgcbswzyhwod.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AC6FbP4HzMhFnk6-HOZ16A_Zd7okp6T'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
