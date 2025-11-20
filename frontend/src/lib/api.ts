import axios from 'axios';
import type {
  StartSessionResponse,
  ChatResponse,
  AnalysisResponse,
  ChatMessage,
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

export const profileService = {
  deleteProfile: async (profileId: number): Promise<void> => {
    await api.delete(`/profiles/${profileId}`);
  },
};

export default api;
