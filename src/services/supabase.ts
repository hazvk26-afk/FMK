import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vkfgtleckuoryysdnkww.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i-KbRyIV_RT3QfMFolfReg_egRrLMlL';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
