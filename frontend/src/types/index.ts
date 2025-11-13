// Chat Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  message: string;
  timestamp: number;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
  userId?: string | null;
}

export interface ChatResponse {
  sessionId: string;
  message: string;
  timestamp: number;
}

export interface StartSessionResponse {
  sessionId: string;
  message: string;
}

// Analysis Types
export interface EmotionAnalysis {
  score: number;
  emotionalState: string;
  description: string;
}

export interface PersonalityAnalysis {
  type: string;
  description: string;
  strengths: string[];
  growthAreas: string[];
}

export interface InterestArea {
  name: string;
  level: number;
  description: string;
}

export interface InterestAnalysis {
  description: string;
  areas: InterestArea[];
}

export interface CareerRecommendation {
  careerName: string;
  matchScore: number;
  description: string;
  reasons: string[];
}

export interface AnalysisResponse {
  sessionId: string;
  emotion: EmotionAnalysis;
  personality: PersonalityAnalysis;
  interest: InterestAnalysis;
  comprehensiveAnalysis: string;
  recommendedCareers: CareerRecommendation[];
}

// Chart Data Types
export interface RadarChartData {
  subject: string;
  value: number;
}

export interface BarChartData {
  name: string;
  matchScore: number;
}

