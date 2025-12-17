import axios from "axios";
import type {
  StartSessionResponse,
  ChatResponse,
  AnalysisResponse,
  ChatMessage,
  CareerRecommendation,
  LearningPath,
  Question,
  StudentAnswer,
  DashboardStats,
  CreateLearningPathRequest,
  SubmitAnswerRequest,
} from "@/types/index";

// =============================
//   🔹 API BASE URL (dev 기준)
// =============================
export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || `${BACKEND_BASE_URL}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Axios instance for Spring Boot backend
export const backendApi = axios.create({
  baseURL: `${BACKEND_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// JWT 토큰을 Authorization 헤더에 추가하는 interceptor
const addAuthHeader = (config: any) => {
  const userStr = localStorage.getItem("dreampath:user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.accessToken) {
        config.headers.Authorization = `Bearer ${user.accessToken}`;
      }
    } catch {
      // 파싱 실패 시 무시
    }
  }
  return config;
};

api.interceptors.request.use(addAuthHeader);
backendApi.interceptors.request.use(addAuthHeader);

// Native fetch wrapper with JWT auth header
export const authFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const headers = new Headers(init?.headers);

  const userStr = localStorage.getItem("dreampath:user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.accessToken) {
        headers.set("Authorization", `Bearer ${user.accessToken}`);
      }
    } catch {
      // ignore
    }
  }

  // Set Content-Type if not set and body exists
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, { ...init, headers });
};

export interface JobDetailData {
  jobId: number;
  summary?: string | null;
  wageText?: string | null;
  wageSource?: string | null;
  aptitudeText?: string | null;
  abilities?: Array<Record<string, any>>;
  majors?: Array<Record<string, any>>;
  certifications?: Array<Record<string, any>>;
  rawData?: Record<string, any>;
}

export interface MajorDetailData {
  majorId: number;
  majorName?: string | null;
  summary?: string | null;
  interest?: string | null;
  propertyText?: string | null;
  job?: string | null;
  salary?: string | null;
  employment?: string | null;
  rawData?: {
    // Basic info
    major?: string;
    summary?: string;
    major_summary?: string;
    interest?: string;
    property?: string;
    characteristics?: string;
    job?: string;
    salary?: string;
    employment?: string;
    relateQualf?: string; // 관련 자격
    lClass?: string; // 대분류
    mClass?: string; // 중분류
    // Chart data - can be object or array
    chartData?: {
      gender?: Array<{ item: string; data: number }>;
      field?: Array<{ item: string; data: number }>;
      after_graduation?: Array<{ item: string; data: number }>;
      employment_rate?: Array<{ item: string; data: number }>;
      [key: string]: any;
    } | Array<any>;
    // Department list (universities offering this major)
    department?: Array<{
      univ_NM?: string;
      campus_NM?: string;
      [key: string]: any;
    }>;
    // Curriculum data
    highSchoolSubjects?: Array<{ subject_DESCRIPTION?: string }>;
    careerActivities?: Array<{ act_NAME?: string; act_DESCRIPTION?: string }>;
    majorSubjects?: Array<{ subject_NAME?: string; subject_DESCRIPTION?: string }>;
    // Career paths
    graduateAfter?: Array<{ graduate_AFTER_NAME?: string; graduate_AFTER_DESCRIPTION?: string }>;
    relatedJobs?: Array<{ relate_JOB_NAME?: string }>;
    [key: string]: any;
  };
}

export const fetchJobDetail = async (jobId: number | string): Promise<JobDetailData> => {
  const response = await backendApi.get<JobDetailData>(`/job/${jobId}/details`);
  return response.data;
};

export const fetchMajorDetail = async (majorId: number | string): Promise<MajorDetailData> => {
  const response = await backendApi.get<MajorDetailData>(`/major/${majorId}/details`);
  return response.data;
};


/* ================================
   🔹 DreamPath – Chat Service
   ================================ */
export const chatService = {
  startSession: async (
    userId: string | null = null
  ): Promise<StartSessionResponse> => {
    const response = await api.post<StartSessionResponse>("/chat/start", {
      userId,
    });
    return response.data;
  },

  sendMessage: async (
    sessionId: string,
    message: string,
    userId: string | null = null
  ): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>("/chat", {
      sessionId,
      message,
      userId,
    });
    return response.data;
  },

  getHistory: async (sessionId: string): Promise<ChatMessage[]> => {
    const response = await api.get<ChatMessage[]>(`/chat/history/${sessionId}`);
    return response.data;
  },
};

/* ================================
   🔹 DreamPath – Analysis Service
   ================================ */
export const analysisService = {
  analyzeSession: async (sessionId: string): Promise<AnalysisResponse> => {
    const response = await api.post<AnalysisResponse>(`/analysis/${sessionId}`);
    return response.data;
  },
};

// Python AI Service URL (채용 정보 크롤링용)
export const PYTHON_AI_SERVICE_URL =
  import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";

export const pythonApi = axios.create({
  baseURL: PYTHON_AI_SERVICE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 240000, // 4분 (AI 분석 API가 오래 걸림)
});

export const jobSiteService = {
  // 취업 사이트 추천
  recommendJobSites: async (
    careerRecommendations: CareerRecommendation[],
    userInterests?: string[],
    userExperienceLevel?: string
  ) => {
    const response = await pythonApi.post("/api/job-sites/recommend", {
      careerRecommendations,
      userInterests,
      userExperienceLevel,
    });
    return response.data;
  },

  // 원티드 크롤링
  crawlWanted: async (
    searchKeyword?: string,
    maxResults: number = 10,
    forceRefresh: boolean = false
  ) => {
    const response = await pythonApi.post("/api/job-sites/crawl/wanted", {
      searchKeyword,
      maxResults,
      forceRefresh,
    });
    return response.data;
  },

  // 특정 사이트 크롤링
  crawlJobSite: async (
    siteName: string,
    siteUrl: string,
    searchKeyword?: string,
    maxResults: number = 10,
    forceRefresh: boolean = false
  ) => {
    const response = await pythonApi.post("/api/job-sites/crawl", {
      siteName,
      siteUrl,
      searchKeyword,
      maxResults,
      forceRefresh,
    });
    return response.data;
  },

  // 모든 취업 사이트 목록 조회
  getAllJobSites: async () => {
    const response = await pythonApi.get("/api/job-sites/all");
    return response.data;
  },

  // DB에서 채용 공고 검색
  searchJobListings: async (
    siteName?: string,
    searchKeyword?: string,
    limit: number = 100,
    offset: number = 0
  ) => {
    const response = await pythonApi.post("/api/job-sites/listings/query", {
      siteName,
      searchKeyword,
      limit,
      offset,
    });
    return response.data;
  },
};

export const callPersonalityAgent = (payload: Record<string, any>) =>
  pythonApi.post("/api/agent/personality", payload).then((res) => res.data);

/* ================================
   🔹 DreamPath – Profile Service
   ================================ */
export const profileService = {
  deleteProfile: async (profileId: number): Promise<void> => {
    await api.delete(`/profiles/${profileId}`);
  },

  // 하이브리드 추천 (벡터 기반 채용 추천)
  fetchHybridJobs: async (vectorId: string, topK: number = 20) => {
    const response = await api.get(`/recommend/hybrid`, {
      params: { vectorId, topK },
    });
    return response.data.recommended;
  },
};

/* ================================
   🔹 Learning Path Service (dev)
   ================================ */
export const learningPathService = {
  // Learning Path 생성
  createLearningPath: async (
    data: CreateLearningPathRequest
  ): Promise<LearningPath> => {
    const response = await api.post<LearningPath>("/learning-paths", data);
    return response.data;
  },

  // Learning Path 조회
  getLearningPath: async (pathId: number): Promise<LearningPath> => {
    const response = await api.get<LearningPath>(`/learning-paths/${pathId}`);
    return response.data;
  },

  // 사용자별 Learning Path 목록 조회
  getUserLearningPaths: async (userId: number): Promise<LearningPath[]> => {
    const response = await api.get<LearningPath[]>(
      `/learning-paths/user/${userId}`
    );
    return response.data;
  },

  // 주차별 문제 생성
  generateQuestions: async (
    weeklyId: number,
    count: number = 5
  ): Promise<void> => {
    await api.post(
      `/learning-paths/weekly-sessions/${weeklyId}/generate-questions`,
      {
        count,
      }
    );
  },

  // 주차별 문제 목록 조회 (기존 제출 답안 포함)
  getWeeklyQuestions: async (weeklyId: number, userId?: number): Promise<Question[]> => {
    const params = userId ? { userId } : {};
    const response = await api.get<Question[]>(
      `/learning-paths/weekly-sessions/${weeklyId}/questions`,
      { params }
    );
    return response.data;
  },

  // 답안 제출
  submitAnswer: async (
    questionId: number,
    data: SubmitAnswerRequest
  ): Promise<StudentAnswer> => {
    const response = await api.post<StudentAnswer>(
      `/learning-paths/questions/${questionId}/submit`,
      data
    );
    return response.data;
  },

  // 주차 완료
  completeSession: async (weeklyId: number): Promise<void> => {
    await api.post(`/learning-paths/weekly-sessions/${weeklyId}/complete`);
  },

  // Dashboard 통계 조회
  getDashboard: async (pathId: number): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>(
      `/learning-paths/${pathId}/dashboard`
    );
    return response.data;
  },
};

/* ================================
   🔹 Job Analysis Agent
   ================================ */
export const jobAnalysisService = {
  analyzeMarketTrends: async (careerField?: string, days: number = 30) => {
    const response = await pythonApi.post("/api/job-analysis/market-trends", {
      careerField,
      days,
    });
    return response.data;
  },

  analyzeSkillRequirements: async (careerField: string, days: number = 30) => {
    const response = await pythonApi.post("/api/job-analysis/skill-requirements", {
      careerField,
      days,
    });
    return response.data;
  },

  analyzeSalaryTrends: async (careerField?: string, days: number = 30) => {
    const response = await pythonApi.post("/api/job-analysis/salary-trends", {
      careerField,
      days,
    });
    return response.data;
  },

  getPersonalizedInsights: async (userProfile: any, careerAnalysis: any) => {
    const response = await pythonApi.post("/api/job-analysis/personalized-insights", {
      userProfile,
      careerAnalysis,
    });
    return response.data;
  },

  compareJobs: async (jobIds: number[]) => {
    const response = await pythonApi.post("/api/job-analysis/compare-jobs", {
      jobIds,
    });
    return response.data;
  },
};

/* ================================
   🔹 Job Recommendation Agent
   ================================ */
export const jobRecommendationService = {
  // 캐시된 추천 조회 (빠른 응답)
  getCachedRecommendations: async (userId: number, limit: number = 20, minScore: number = 0) => {
    const response = await pythonApi.get(`/api/job-agent/recommendations/fast/${userId}`, {
      params: { limit, min_score: minScore },
    });
    return response.data;
  },

  // 진로상담 직업추천 기반 채용공고 추천
  getRecommendationsByCareerAnalysis: async (userId: number, limit: number = 20) => {
    const response = await pythonApi.get(`/api/job-agent/recommendations/by-careers/${userId}`, {
      params: { limit },
    });
    return response.data;
  },

  // 추천 계산 트리거 (백그라운드 실행)
  triggerCalculation: async (userId: number, background: boolean = true) => {
    const response = await pythonApi.post(
      `/api/job-agent/recommendations/calculate/${userId}`,
      {},
      { params: { background } }
    );
    return response.data;
  },

  getRecommendations: async (userId: number, careerAnalysis: any, userProfile?: any, limit: number = 10) => {
    const response = await pythonApi.post("/api/agent/job-recommendations", {
      userId,
      careerAnalysis,
      userProfile,
      limit,
    });
    return response.data;
  },

  getRealtimeRecommendations: async (userId: number, careerKeywords: string[], limit: number = 5) => {
    const response = await pythonApi.post("/api/agent/job-recommendations/realtime", {
      userId,
      careerKeywords,
      limit,
    });
    return response.data;
  },

  // 기술/자격증 포함 추천
  getRecommendationsWithRequirements: async (
    userId: number,
    careerAnalysis: any,
    userProfile?: any,
    userSkills?: string[],
    limit: number = 15
  ) => {
    const response = await pythonApi.post("/api/agent/job-recommendations/with-requirements", {
      userId,
      careerAnalysis,
      userProfile,
      userSkills,
      limit,
    });
    return response.data;
  },
};

export const mentorService = {
  // 멘토 신청
  applyForMentor: async (data: {
    userId: number;
    company: string;
    job: string;
    experience: string;
    bio: string;
    career: string;
    availableTime?: Record<string, object>;
  }) => {
    const response = await api.post('/mentors/apply', data);
    return response.data;
  },

  // 내 멘토 신청 상태 조회
  getMyApplication: async (userId: number) => {
    const response = await api.get(`/mentors/my-application/${userId}`);
    return response.data;
  },

  // 관리자: 모든 멘토 신청 목록 조회
  getAllApplications: async () => {
    const response = await api.get('/mentors/applications');
    return response.data;
  },

  // 관리자: 상태별 멘토 신청 목록 조회
  getApplicationsByStatus: async (status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    const response = await api.get(`/mentors/applications/status/${status}`);
    return response.data;
  },

  // 관리자: 멘토 신청 승인/거절
  reviewApplication: async (
    mentorId: number,
    approve: boolean,
    reason: string,
    adminId: number
  ) => {
    const response = await api.patch(`/mentors/applications/${mentorId}/review`, {
      approve,
      reason,
    }, {
      headers: {
        'X-Admin-Id': adminId.toString(),
      },
    });
    return response.data;
  },

  // 승인된 멘토 목록 조회 (검색용)
  getApprovedMentors: async () => {
    const response = await api.get('/mentors/approved');
    return response.data;
  },

  // 멘토 상세 정보 조회
  getMentorDetail: async (mentorId: number) => {
    const response = await api.get(`/mentors/${mentorId}`);
    return response.data;
  },

  // 멘토 프로필 수정
  updateMentorProfile: async (mentorId: number, data: {
    userId: number;
    bio: string;
    career: string;
    availableTime: Record<string, string[]>;
  }) => {
    const response = await api.put(`/mentors/${mentorId}`, data);
    return response.data;
  },
};

export const mentoringSessionService = {
  // 멘토링 세션 생성
  createSession: async (data: {
    mentorId: number;
    title: string;
    description: string;
    sessionDate: string;
    durationMinutes: number;
    price: number;
  }) => {
    const response = await api.post('/mentoring-sessions', data);
    return response.data;
  },

  // 멘토링 세션 수정
  updateSession: async (sessionId: number, data: {
    mentorId: number;
    title: string;
    description: string;
    sessionDate: string;
    durationMinutes: number;
    price: number;
  }) => {
    const response = await api.put(`/mentoring-sessions/${sessionId}`, data);
    return response.data;
  },

  // 멘토링 세션 비활성화
  deactivateSession: async (sessionId: number) => {
    const response = await api.delete(`/mentoring-sessions/${sessionId}`);
    return response.data;
  },

  // 특정 멘토의 세션 목록
  getMentorSessions: async (mentorId: number) => {
    const response = await api.get(`/mentoring-sessions/mentor/${mentorId}`);
    return response.data;
  },

  // 활성화된 모든 세션 (학생용)
  getAvailableSessions: async () => {
    const response = await api.get('/mentoring-sessions/available');
    return response.data;
  },

  // 세션 상세 조회
  getSession: async (sessionId: number) => {
    const response = await api.get(`/mentoring-sessions/${sessionId}`);
    return response.data;
  },
};

export const paymentService = {
  // 결제 준비
  preparePayment: async (userId: number, sessionPackage: string) => {
    const response = await api.post('/payments/prepare', {
      userId,
      sessionPackage,
    });
    return response.data;
  },

  // 결제 완료 (토스페이먼츠)
  completePayment: async (userId: number, paymentKey: string, orderId: string, amount: number) => {
    const response = await api.post('/payments/complete', {
      userId,
      paymentKey,
      orderId,
      amount,
    });
    return response.data;
  },

  // 결제 내역 조회
  getPaymentHistory: async (userId: number) => {
    const response = await api.get(`/payments/history/${userId}`);
    return response.data;
  },

  // 사용 내역 조회
  getUsageHistory: async (userId: number) => {
    const response = await api.get(`/payments/usage/${userId}`);
    return response.data;
  },

  // 잔여 횟수 조회
  getRemainingSessions: async (userId: number) => {
    const response = await api.get(`/payments/remaining/${userId}`);
    return response.data;
  },
};

export const bookingService = {
  // 멘토링 예약 생성 (세션 기반)
  createBooking: async (data: {
    sessionId: number;
    menteeId: number;
    message?: string;
  }) => {
    const response = await api.post('/mentoring-bookings', data);
    return response.data;
  },

  // 내 예약 목록 (멘티)
  getMyBookings: async (userId: number) => {
    const response = await api.get(`/mentoring-bookings/mentee/${userId}`);
    return response.data;
  },

  // 멘토의 예약 목록
  getMentorBookings: async (mentorId: number) => {
    const response = await api.get(`/mentoring-bookings/mentor/${mentorId}`);
    return response.data;
  },

  // 예약 상세 조회
  getBookingDetail: async (bookingId: number) => {
    const response = await api.get(`/mentoring-bookings/${bookingId}`);
    return response.data;
  },

  // 예약 확정 (멘토)
  confirmBooking: async (bookingId: number) => {
    const response = await api.patch(`/mentoring-bookings/${bookingId}/confirm`);
    return response.data;
  },

  // 예약 거절 (멘토)
  rejectBooking: async (bookingId: number, reason: string) => {
    const response = await api.patch(`/mentoring-bookings/${bookingId}/reject`, { reason });
    return response.data;
  },

  // 예약 취소 (멘티)
  cancelBooking: async (bookingId: number) => {
    const response = await api.patch(`/mentoring-bookings/${bookingId}/cancel`);
    return response.data;
  },

  // 멘토링 완료 처리
  completeBooking: async (bookingId: number) => {
    const response = await api.patch(`/mentoring-bookings/${bookingId}/complete`);
    return response.data;
  },

  // LiveKit 토큰 조회
  getLiveKitToken: async (bookingId: number, userId: number) => {
    const response = await api.get(`/mentoring-bookings/${bookingId}/token`, {
      params: { userId },
    });
    return response.data;
  },
};

export const userService = {
  // 사용자 프로필 조회
  getUserProfile: async (userId: number) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  // 사용자 정보 수정
  updateUserProfile: async (userId: number, data: {
    name: string;
    email: string;
    phone: string;
    birth: string;
  }) => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
  },

  // 관리자: 모든 사용자 조회
  getAllUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  // 관리자: 사용자 역할 변경
  updateUserRole: async (userId: number, role: string) => {
    const response = await api.patch(`/users/${userId}/role`, { role });
    return response.data;
  },

  // 관리자: 사용자 활성화/비활성화
  updateUserStatus: async (userId: number, isActive: boolean) => {
    const response = await api.patch(`/users/${userId}/status`, { isActive });
    return response.data;
  },
};

/* ================================
   목표 기업 인재상 분석 서비스
   ================================ */
export const companyTalentService = {
  // 기업 인재상 종합 분석
  analyzeCompanyTalent: async (
    companyName: string,
    userProfile?: any,
    careerAnalysis?: any
  ) => {
    const response = await pythonApi.post("/api/company-talent/analyze", {
      company_name: companyName,
      user_profile: userProfile,
      career_analysis: careerAnalysis,
    });
    return response.data;
  },

  // 6가지 종합 채용 분석 + 맞춤 추천
  getComprehensiveRecommendations: async (
    userId: number,
    careerAnalysis: any,
    userProfile?: any,
    userSkills?: string[],
    limit: number = 10
  ) => {
    const response = await pythonApi.post(
      `/api/job-agent/recommendations/comprehensive/${userId}`,
      {
        career_analysis: careerAnalysis,
        user_profile: userProfile,
        user_skills: userSkills,
        limit: limit,
      }
    );
    return response.data;
  },

  // 단일 채용공고 종합 분석
  analyzeSingleJob: async (
    jobId: string,
    careerAnalysis: any,
    userProfile?: any,
    userSkills?: string[]
  ) => {
    const response = await pythonApi.post(
      `/api/job-agent/analysis/job/${jobId}`,
      {
        career_analysis: careerAnalysis,
        user_profile: userProfile,
        user_skills: userSkills,
      }
    );
    return response.data;
  },

  // 기업 인재상 분석 (GET 방식)
  analyzeCompanyTalentGet: async (companyName: string) => {
    const response = await pythonApi.get(
      `/api/company-talent/analyze/${encodeURIComponent(companyName)}`
    );
    return response.data;
  },

  // 채용공고 상세 분석
  analyzeJobPosting: async (jobId?: string, jobUrl?: string, jobData?: any) => {
    const response = await pythonApi.post("/api/company-talent/analyze-job", {
      job_id: jobId,
      job_url: jobUrl,
      job_data: jobData,
    });
    return response.data;
  },

  // 기업 비교 분석
  compareCompanies: async (
    companyNames: string[],
    userProfile?: any,
    careerAnalysis?: any
  ) => {
    const response = await pythonApi.post("/api/company-talent/compare", {
      company_names: companyNames,
      user_profile: userProfile,
      career_analysis: careerAnalysis,
    });
    return response.data;
  },

  // 기업 검색
  searchCompanies: async (criteria: {
    industry?: string;
    companyType?: string;
    location?: string;
    techStack?: string[];
  }) => {
    const response = await pythonApi.post("/api/company-talent/search", {
      industry: criteria.industry,
      company_type: criteria.companyType,
      location: criteria.location,
      tech_stack: criteria.techStack,
    });
    return response.data;
  },

  // 기업 검색 (GET 방식)
  searchCompaniesGet: async (
    industry?: string,
    companyType?: string,
    location?: string
  ) => {
    const params = new URLSearchParams();
    if (industry) params.append("industry", industry);
    if (companyType) params.append("company_type", companyType);
    if (location) params.append("location", location);

    const response = await pythonApi.get(
      `/api/company-talent/search?${params.toString()}`
    );
    return response.data;
  },
};

/* ================================
   AI 지원서 작성 도우미 서비스
   ================================ */
export const applicationService = {
  // 자기소개서 초안 생성
  generateCoverLetter: async (
    userId: number,
    jobInfo: {
      jobId: string;
      title: string;
      company: string;
      description?: string;
      location?: string;
      url?: string;
    },
    style: "professional" | "passionate" | "creative" = "professional"
  ) => {
    const response = await pythonApi.post("/api/application/generate-cover-letter", {
      userId,
      jobInfo,
      style,
    });
    return response.data;
  },

  // 지원 팁 조회
  getApplicationTips: async (
    userId: number,
    jobInfo: {
      jobId: string;
      title: string;
      company: string;
      description?: string;
      location?: string;
    }
  ) => {
    const response = await pythonApi.post("/api/application/tips", {
      userId,
      jobInfo,
    });
    return response.data;
  },

  // 자기소개서 피드백
  reviewCoverLetter: async (
    coverLetter: string,
    jobInfo: {
      jobId: string;
      title: string;
      company: string;
      description?: string;
    },
    userId?: number
  ) => {
    const response = await pythonApi.post("/api/application/review", {
      userId,
      coverLetter,
      jobInfo,
    });
    return response.data;
  },
};

export default api;
// trigger deploy
