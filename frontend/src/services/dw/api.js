import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

export const chatService = {
  startSession: async (userId = null) => {
    const response = await api.post('/chat/start', { userId })
    return response.data
  },

  sendMessage: async (sessionId, message, userId = null) => {
    const response = await api.post('/chat', {
      sessionId,
      message,
      userId,
    })
    return response.data
  },

  getHistory: async (sessionId) => {
    const response = await api.get(`/chat/history/${sessionId}`)
    return response.data
  },
}

export const analysisService = {
  analyzeSession: async (sessionId) => {
    const response = await api.post(`/analysis/${sessionId}`)
    return response.data
  },
}

export default api

