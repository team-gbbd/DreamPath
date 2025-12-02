// src/lib/getFaq.ts

const API_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";
const API_URL = `${API_BASE_URL}/api`;

/* ==========================================================
   📌 1) 모든 FAQ 불러오기 (카테고리 목록 만들 때 사용)
   ========================================================== */
export async function fetchAllFaq() {
  try {
    const response = await fetch(`${API_URL}/faq/all`);

    if (!response.ok) {
      console.error("❌ FAQ 전체 조회 실패:", response.status);
      return [];
    }

    const data = await response.json();
    console.log("📌 FAQ 전체 데이터:", data);
    return data || [];
  } catch (error) {
    console.error("❌ FAQ 전체 조회 에러:", error);
    return [];
  }
}

/* ==========================================================
   📌 2) 특정 카테고리의 FAQ 불러오기
   ========================================================== */
export async function fetchFaqByCategory(category: string) {
  try {
    const encodedCategory = encodeURIComponent(category);
    const response = await fetch(`${API_URL}/faq/category?name=${encodedCategory}`);

    if (!response.ok) {
      console.error(`❌ FAQ 카테고리 조회 실패: ${category}`, response.status);
      return [];
    }

    const data = await response.json();
    console.log(`📌 ${category} FAQ:`, data);
    return data || [];
  } catch (error) {
    console.error(`❌ FAQ 카테고리 조회 에러: ${category}`, error);
    return [];
  }
}
