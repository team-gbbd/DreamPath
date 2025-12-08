// src/lib/getFaq.ts

import { PYTHON_AI_SERVICE_URL } from "../api";

// Python 백엔드 API URL
const API_BASE_URL = `${PYTHON_AI_SERVICE_URL}/api`;

/* ==========================================================
   📌 Helper: 사용자 타입 확인 (회원/비회원)
   ========================================================== */
function getUserType(): string {
  // localStorage에서 사용자 정보 확인
  if (typeof window === "undefined") return "guest";

  const userStr = localStorage.getItem("dreampath:user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.userId ? "member" : "guest";
    } catch (e) {
      return "guest";
    }
  }
  return "guest";
}

/* ==========================================================
   📌 1) 모든 FAQ 불러오기 (카테고리 목록 만들 때 사용)
   ========================================================== */
export async function fetchAllFaq() {
  try {
    const userType = getUserType();
    const response = await fetch(`${API_BASE_URL}/faq/all?user_type=${userType}`);

    if (!response.ok) {
      console.error("❌ FAQ 전체 조회 실패:", response.status);
      return [];
    }

    const data = await response.json();
    console.log(`📌 FAQ 전체 데이터 (user_type: ${userType}):`, data);
    return data || [];
  } catch (error) {
    console.error("❌ FAQ 전체 조회 에러:", error);
    return [];
  }
}

/* ==========================================================
   📌 2) FAQ 카테고리 목록 불러오기
   ========================================================== */
export async function fetchFaqCategories(customUserType?: string) {
  try {
    const userType = customUserType || getUserType();
    const response = await fetch(`${API_BASE_URL}/faq/categories?user_type=${userType}`);

    if (!response.ok) {
      console.error("❌ FAQ 카테고리 목록 조회 실패:", response.status);
      return [];
    }

    const data = await response.json();
    console.log(`📌 FAQ 카테고리 목록 (user_type: ${userType}):`, data);
    return data || [];
  } catch (error) {
    console.error("❌ FAQ 카테고리 목록 조회 에러:", error);
    return [];
  }
}

/* ==========================================================
   📌 3) 특정 카테고리의 FAQ 불러오기
   ========================================================== */
export async function fetchFaqByCategory(category: string, customUserType?: string) {
  try {
    const userType = customUserType || getUserType();
    const encodedCategory = encodeURIComponent(category);
    const response = await fetch(`${API_BASE_URL}/faq/category?name=${encodedCategory}&user_type=${userType}`);

    if (!response.ok) {
      console.error(`❌ FAQ 카테고리 조회 실패: ${category}`, response.status);
      return [];
    }

    const data = await response.json();
    console.log(`📌 ${category} FAQ (user_type: ${userType}):`, data);
    return data || [];
  } catch (error) {
    console.error(`❌ FAQ 카테고리 조회 에러: ${category}`, error);
    return [];
  }
}
