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
//   API BASE URL (환경변수)
// =============================
export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || `${BACKEND_BASE_URL}/api`;

// Python AI Service URL
const PYTHON_AI_SERVICE_URL =
  import.meta.env.VITE_PYTHON_AI_SERVICE_URL || "http://localhost:8000";

const PYTHON_API_URL = `${PYTHON_AI_SERVICE_URL}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const pythonApi = axios.create({
  baseURL: PYTHON_AI_SERVICE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ================================
   DreamPath – Chat Service
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
   DreamPath – Analysis Service
   ================================ */
export const analysisService = {
  analyzeSession: async (sessionId: string): Promise<AnalysisResponse> => {
    const response = await api.post<AnalysisResponse>(`/analysis/${sessionId}`);
    return response.data;
  },
};

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

/* ================================
   DreamPath – Profile Service
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
   Learning Path Service
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
   Job Analysis Agent
   ================================ */
export const jobAnalysisService = {
  analyzeMarketTrends: async (careerField?: string, days: number = 30) => {
    const response = await axios.post(`${PYTHON_API_URL}/job-analysis/market-trends`, {
      careerField,
      days,
    });
    return response.data;
  },

  analyzeSkillRequirements: async (careerField: string, days: number = 30) => {
    const response = await axios.post(`${PYTHON_API_URL}/job-analysis/skill-requirements`, {
      careerField,
      days,
    });
    return response.data;
  },

  analyzeSalaryTrends: async (careerField?: string, days: number = 30) => {
    const response = await axios.post(`${PYTHON_API_URL}/job-analysis/salary-trends`, {
      careerField,
      days,
    });
    return response.data;
  },

  getPersonalizedInsights: async (userProfile: any, careerAnalysis: any) => {
    const response = await axios.post(`${PYTHON_API_URL}/job-analysis/personalized-insights`, {
      userProfile,
      careerAnalysis,
    });
    return response.data;
  },

  compareJobs: async (jobIds: number[]) => {
    const response = await axios.post(`${PYTHON_API_URL}/job-analysis/compare-jobs`, {
      jobIds,
    });
    return response.data;
  },
};

/* ================================
   Job Recommendation Agent
   ================================ */
export const jobRecommendationService = {
  getRecommendations: async (userId: number, careerAnalysis: any, userProfile?: any, limit: number = 10) => {
    const response = await axios.post(`${PYTHON_API_URL}/agent/job-recommendations`, {
      userId,
      careerAnalysis,
      userProfile,
      limit,
    });
    return response.data;
  },

  getRealtimeRecommendations: async (userId: number, careerKeywords: string[], limit: number = 5) => {
    const response = await axios.post(`${PYTHON_API_URL}/agent/job-recommendations/realtime`, {
      userId,
      careerKeywords,
      limit,
    });
    return response.data;
  },

  // 채용 공고 + 필요 기술/자격증 통합 추천
  getRecommendationsWithRequirements: async (
    userId: number,
    careerAnalysis: any,
    userProfile?: any,
    userSkills?: string[],
    limit: number = 10
  ) => {
    const response = await axios.post(`${PYTHON_API_URL}/agent/job-recommendations/with-requirements`, {
      userId,
      careerAnalysis,
      userProfile,
      userSkills,
      limit,
    });
    return response.data;
  },
};

/* ================================
   Mentor Service
   ================================ */
export const mentorService = {
  // 멘토 신청
  applyForMentor: async (data: {
    userId: number;
    bio: string;
    career: string;
    availableTime: Record<string, string[]>;
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

/* ================================
   Mentoring Session Service
   ================================ */
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

/* ================================
   Payment Service
   ================================ */
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

/* ================================
   Booking Service
   ================================ */
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

/* ================================
   User Service
   ================================ */
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
};

/* ================================
   Job Agent (OpenAI Agents SDK)
   ================================ */
export const jobAgentService = {
  // 채용 에이전트와 대화
  chat: async (message: string, userId?: number, agentType: string = "main") => {
    const response = await axios.post(`${PYTHON_API_URL}/agent/job-agent`, {
      message,
      userId,
      agentType,
    });
    return response.data;
  },
};

/* ================================
   Q-net 자격증 Service
   ================================ */
export const qnetService = {
  // 계열 코드 목록 조회
  getSeriesCodes: async () => {
    const response = await axios.get(`${PYTHON_API_URL}/qnet/series-codes`);
    return response.data;
  },

  // 자격증 목록 조회
  getQualifications: async (data: {
    seriesCode?: string;
    qualificationName?: string;
    pageNo?: number;
    numOfRows?: number;
  }) => {
    const response = await axios.post(`${PYTHON_API_URL}/qnet/qualifications`, data);
    return response.data;
  },

  // 시험 일정 조회
  getExamSchedule: async (data: {
    qualificationCode?: string;
    qualificationName?: string;
    year?: string;
    pageNo?: number;
    numOfRows?: number;
  }) => {
    const response = await axios.post(`${PYTHON_API_URL}/qnet/exam-schedule`, data);
    return response.data;
  },

  // 직업 기반 자격증 추천
  getCertificationsForJob: async (jobKeywords: string[]) => {
    const response = await axios.post(`${PYTHON_API_URL}/qnet/certifications-for-job`, {
      jobKeywords,
    });
    return response.data;
  },

  // 자격증 상세 정보 + 시험 일정
  getCertificationDetail: async (qualificationName: string) => {
    const response = await axios.post(`${PYTHON_API_URL}/qnet/certification-detail`, {
      qualificationName,
    });
    return response.data;
  },

  // 빠른 검색
  quickSearch: async (keyword: string) => {
    const response = await axios.get(`${PYTHON_API_URL}/qnet/search/${encodeURIComponent(keyword)}`);
    return response.data;
  },
};

export default api;
