import { createClient } from '@supabase/supabase-js';

// --- 디버깅 코드 시작 ---
console.log("--- Supabase 클라이언트 초기화 시작 ---");
console.log("VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("VITE_SUPABASE_ANON_KEY:", import.meta.env.VITE_SUPABASE_ANON_KEY);
// --- 디버깅 코드 끝 ---

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("치명적 오류: Supabase 환경 변수가 없습니다!");
    throw new Error("Supabase URL 또는 Anon Key가 누락되었습니다. .env.local 파일을 확인하고 개발 서버를 완전히 재시작하세요.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("Supabase 클라이언트가 성공적으로 생성되었습니다.");