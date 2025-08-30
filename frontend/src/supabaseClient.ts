import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("치명적인 오류: Supabase URL 또는 Anon Key가 설정되지 않았습니다.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);