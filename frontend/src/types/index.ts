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
  identityStatus?: IdentityStatus;
  stageChanged?: boolean;
}

export interface StartSessionResponse {
  sessionId: string;
  message: string;
}

// Identity Analysis Types
export interface RecentInsight {
  type: string;
  description: string;
  relevanceScore: number;
}

export interface StageProgress {
  PRESENT: number;
  PAST: number;
  VALUES: number;
  FUTURE: number;
}

export interface IdentityStatus {
  currentStage: string;
  clarity: number;
  identityCore: string;
  recentInsight: RecentInsight | null;
  nextStageSuggestion: boolean;
  stageProgress: StageProgress;
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

// Job Site Types
export interface JobListing {
  title: string;
  company?: string;
  location?: string;
  description?: string;
  url: string;
  id?: string;
  reward?: string;
}

export interface JobSiteRecommendation {
  name: string;
  url: string;
  description: string;
  matchScore: number;
  reasons: string[];
  categories: string[];
}

export interface CrawlResponse {
  success: boolean;
  site: string;
  searchKeyword?: string;
  totalResults: number;
  jobListings: JobListing[];
  searchUrl?: string;
  error?: string;
  message?: string;
  fromCache?: boolean;
  cachedAt?: string;
}

