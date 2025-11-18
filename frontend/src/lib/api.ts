import axios from 'axios';
import type {
  StartSessionResponse,
  ChatResponse,
  AnalysisResponse,
  ChatMessage,
  CareerRecommendation,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

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

// Python AI Service URL (채용 정보 크롤링용)
const PYTHON_AI_SERVICE_URL = process.env.NEXT_PUBLIC_PYTHON_AI_SERVICE_URL || 'http://localhost:8000';

const pythonApi = axios.create({
  baseURL: PYTHON_AI_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const jobSiteService = {
  // 취업 사이트 추천
  recommendJobSites: async (careerRecommendations: CareerRecommendation[], userInterests?: string[], userExperienceLevel?: string) => {
    const response = await pythonApi.post('/api/job-sites/recommend', {
      careerRecommendations,
      userInterests,
      userExperienceLevel,
    });
    return response.data;
  },

  // 원티드 크롤링
  crawlWanted: async (searchKeyword?: string, maxResults: number = 10, forceRefresh: boolean = false) => {
    const response = await pythonApi.post('/api/job-sites/crawl/wanted', {
      searchKeyword,
      maxResults,
      forceRefresh,
    });
    return response.data;
  },

  // 특정 사이트 크롤링
  crawlJobSite: async (siteName: string, siteUrl: string, searchKeyword?: string, maxResults: number = 10, forceRefresh: boolean = false) => {
    const response = await pythonApi.post('/api/job-sites/crawl', {
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
    const response = await pythonApi.get('/api/job-sites/all');
    return response.data;
  },
};

export default api;

