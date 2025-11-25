import axios from 'axios';
import type {
  StartSessionResponse,
  ChatResponse,
  AnalysisResponse,
  ChatMessage,
  LearningPath,
  Question,
  StudentAnswer,
  DashboardStats,
  CreateLearningPathRequest,
  SubmitAnswerRequest,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const chatService = {
  startSession: async (userId: string | null = null): Promise<StartSessionResponse> => {
    const response = await api.post<StartSessionResponse>('/chat/start', { userId });
    return response.data;
  },

  sendMessage: async (
    sessionId: string,
    message: string,
    userId: string | null = null
  ): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>('/chat', {
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

export const analysisService = {
  analyzeSession: async (sessionId: string): Promise<AnalysisResponse> => {
    const response = await api.post<AnalysisResponse>(`/analysis/${sessionId}`);
    return response.data;
  },
};

export const learningPathService = {
  // Learning Path 생성
  createLearningPath: async (data: CreateLearningPathRequest): Promise<LearningPath> => {
    const response = await api.post<LearningPath>('/learning-paths', data);
    return response.data;
  },

  // Learning Path 조회
  getLearningPath: async (pathId: number): Promise<LearningPath> => {
    const response = await api.get<LearningPath>(`/learning-paths/${pathId}`);
    return response.data;
  },

  // 사용자별 Learning Path 목록 조회
  getUserLearningPaths: async (userId: number): Promise<LearningPath[]> => {
    const response = await api.get<LearningPath[]>(`/learning-paths/user/${userId}`);
    return response.data;
  },

  // 주차별 문제 생성
  generateQuestions: async (weeklyId: number, count: number = 5): Promise<void> => {
    await api.post(`/learning-paths/weekly-sessions/${weeklyId}/generate-questions`, {
      count,
    });
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
    const response = await api.get<DashboardStats>(`/learning-paths/${pathId}/dashboard`);
    return response.data;
  },
};

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
};

export default api;

