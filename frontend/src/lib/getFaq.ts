// src/lib/getFaq.ts
import { createClient } from "@supabase/supabase-js";

// 🔥 Vite 환경에서는 반드시 import.meta.env 사용
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 환경변수 체크
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase 환경변수가 설정되지 않았습니다.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/* ==========================================================
   📌 1) 모든 FAQ 불러오기 (카테고리 목록 만들 때 사용)
   ========================================================== */
export async function fetchAllFaq() {
  const { data, error } = await supabase.from("faq").select("*");

  if (error) {
    console.error("❌ FAQ 전체 조회 실패:", error);
    return [];
  }

  console.log("📌 FAQ 전체 데이터:", data);
  return data || [];
}

/* ==========================================================
   📌 2) 특정 카테고리의 FAQ 불러오기
   ========================================================== */
export async function fetchFaqByCategory(category: string) {
  const { data, error } = await supabase
    .from("faq")
    .select("*")
    .eq("category", category);

  if (error) {
    console.error(`❌ FAQ 카테고리 조회 실패: ${category}`, error);
    return [];
  }

  console.log(`📌 ${category} FAQ:`, data);
  return data || [];
}
