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
} from '@/types/index';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/* ================================
   🔹 DreamPath – Chat Service
   ================================ */
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

/* ================================
   🔹 DreamPath – Analysis Service
   ================================ */
export const analysisService = {
  analyzeSession: async (sessionId: string): Promise<AnalysisResponse> => {
    const response = await api.post<AnalysisResponse>(`/analysis/${sessionId}`);
    return response.data;
  },
};

/* ================================
   🔹 DreamPath – Profile Service
   ================================ */
export const profileService = {
  deleteProfile: async (profileId: number): Promise<void> => {
    await api.delete(`/profiles/${profileId}`);
  },
};

/* ================================
   🔹 Learning Path Service (dev)
   ================================ */
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

  // 주차별 문제 목록 조회
  getWeeklyQuestions: async (weeklyId: number): Promise<Question[]> => {
    const response = await api.get<Question[]>(`/learning-paths/weekly-sessions/${weeklyId}/questions`);
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

export default api;
