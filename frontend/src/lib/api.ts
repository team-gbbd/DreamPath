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

  getAllJobSites: async () => {
    const response = await pythonApi.get("/api/job-sites/all");
    return response.data;
  },

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
  createLearningPath: async (
    data: CreateLearningPathRequest
  ): Promise<LearningPath> => {
    const response = await api.post<LearningPath>("/learning-paths", data);
    return response.data;
  },

  getLearningPath: async (pathId: number): Promise<LearningPath> => {
    const response = await api.get<LearningPath>(`/learning-paths/${pathId}`);
    return response.data;
  },

  getUserLearningPaths: async (userId: number): Promise<LearningPath[]> => {
    const response = await api.get<LearningPath[]>(
      `/learning-paths/user/${userId}`
    );
    return response.data;
  },

  generateQuestions: async (
    weeklyId: number,
    count: number = 5
  ): Promise<void> => {
    await api.post(
      `/learning-paths/weekly-sessions/${weeklyId}/generate-questions`,
      { count }
    );
  },

  getWeeklyQuestions: async (weeklyId: number, userId?: number): Promise<Question[]> => {
    const params = userId ? { userId } : {};
    const response = await api.get<Question[]>(
      `/learning-paths/weekly-sessions/${weeklyId}/questions`,
      { params }
    );
    return response.data;
  },

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

  completeSession: async (weeklyId: number): Promise<void> => {
    await api.post(`/learning-paths/weekly-sessions/${weeklyId}/complete`);
  },

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
  applyForMentor: async (data: {
    userId: number;
    bio: string;
    career: string;
    availableTime: Record<string, string[]>;
  }) => {
    const response = await api.post('/mentors/apply', data);
    return response.data;
  },

  getMyApplication: async (userId: number) => {
    const response = await api.get(`/mentors/my-application/${userId}`);
    return response.data;
  },

  getAllApplications: async () => {
    const response = await api.get('/mentors/applications');
    return response.data;
  },

  getApplicationsByStatus: async (status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    const response = await api.get(`/mentors/applications/status/${status}`);
    return response.data;
  },

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
      headers: { 'X-Admin-Id': adminId.toString() },
    });
    return response.data;
  },

  getApprovedMentors: async () => {
    const response = await api.get('/mentors/approved');
    return response.data;
  },

  getMentorDetail: async (mentorId: number) => {
    const response = await api.get(`/mentors/${mentorId}`);
    return response.data;
  },

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

  deactivateSession: async (sessionId: number) => {
    const response = await api.delete(`/mentoring-sessions/${sessionId}`);
    return response.data;
  },

  getMentorSessions: async (mentorId: number) => {
    const response = await api.get(`/mentoring-sessions/mentor/${mentorId}`);
    return response.data;
  },

  getAvailableSessions: async () => {
    const response = await api.get('/mentoring-sessions/available');
    return response.data;
  },

  getSession: async (sessionId: number) => {
    const response = await api.get(`/mentoring-sessions/${sessionId}`);
    return response.data;
  },
};

/* ================================
   Payment Service
   ================================ */
export const paymentService = {
  preparePayment: async (userId: number, sessionPackage: string) => {
    const response = await api.post('/payments/prepare', {
      userId,
      sessionPackage,
    });
    return response.data;
  },

  completePayment: async (userId: number, paymentKey: string, orderId: string, amount: number) => {
    const response = await api.post('/payments/complete', {
      userId,
      paymentKey,
      orderId,
      amount,
    });
    return response.data;
  },

  getPaymentHistory: async (userId: number) => {
    const response = await api.get(`/payments/history/${userId}`);
    return response.data;
  },

  getUsageHistory: async (userId: number) => {
    const response = await api.get(`/payments/usage/${userId}`);
    return response.data;
  },

  getRemainingSessions: async (userId: number) => {
    const response = await api.get(`/payments/remaining/${userId}`);
    return response.data;
  },
};

/* ================================
   Booking Service
   ================================ */
export const bookingService = {
  createBooking: async (data: {
    sessionId: number;
    menteeId: number;
    message?: string;
  }) => {
    const response = await api.post('/mentoring-bookings', data);
    return response.data;
  },

  getMyBookings: async (userId: number) => {
    const response = await api.get(`/mentoring-bookings/mentee/${userId}`);
    return response.data;
  },

  getMentorBookings: async (mentorId: number) => {
    const response = await api.get(`/mentoring-bookings/mentor/${mentorId}`);
    return response.data;
  },

  getBookingDetail: async (bookingId: number) => {
    const response = await api.get(`/mentoring-bookings/${bookingId}`);
    return response.data;
  },

  confirmBooking: async (bookingId: number) => {
    const response = await api.patch(`/mentoring-bookings/${bookingId}/confirm`);
    return response.data;
  },

  rejectBooking: async (bookingId: number, reason: string) => {
    const response = await api.patch(`/mentoring-bookings/${bookingId}/reject`, { reason });
    return response.data;
  },

  cancelBooking: async (bookingId: number) => {
    const response = await api.patch(`/mentoring-bookings/${bookingId}/cancel`);
    return response.data;
  },

  completeBooking: async (bookingId: number) => {
    const response = await api.patch(`/mentoring-bookings/${bookingId}/complete`);
    return response.data;
  },

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
  getUserProfile: async (userId: number) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

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
  getSeriesCodes: async () => {
    const response = await axios.get(`${PYTHON_API_URL}/qnet/series-codes`);
    return response.data;
  },

  getQualifications: async (data: {
    seriesCode?: string;
    qualificationName?: string;
    pageNo?: number;
    numOfRows?: number;
  }) => {
    const response = await axios.post(`${PYTHON_API_URL}/qnet/qualifications`, data);
    return response.data;
  },

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

  getCertificationsForJob: async (jobKeywords: string[]) => {
    const response = await axios.post(`${PYTHON_API_URL}/qnet/certifications-for-job`, {
      jobKeywords,
    });
    return response.data;
  },

  getCertificationDetail: async (qualificationName: string) => {
    const response = await axios.post(`${PYTHON_API_URL}/qnet/certification-detail`, {
      qualificationName,
    });
    return response.data;
  },

  quickSearch: async (keyword: string) => {
    const response = await axios.get(`${PYTHON_API_URL}/qnet/search/${encodeURIComponent(keyword)}`);
    return response.data;
  },
};

export default api;
