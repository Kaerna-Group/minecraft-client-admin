import { createClient } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './env';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
