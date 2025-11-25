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

// Learning Path Types
export interface LearningPath {
  id: number;
  pathId: number;
  userId: number;
  domain: string;
  subDomain?: string;
  status: 'ACTIVE' | 'COMPLETED';
  totalQuestions: number;
  correctCount: number;
  correctRate: number;
  weaknessTags: string[];
  createdAt: string;
  updatedAt: string;
  weeklySessions: WeeklySessionInfo[];
  overallProgress?: number;
  currentWeek?: number;
}

export interface WeeklySessionInfo {
  weeklyId: number;
  weekNumber: number;
  status: 'LOCKED' | 'UNLOCKED' | 'COMPLETED';
  questionCount: number;
  correctCount: number;
  aiSummary: string | null;
  createdAt: string;
}

export interface SubmittedAnswerInfo {
  answerId: number;
  userAnswer: string;
  score: number;
  aiFeedback: string;
  submittedAt: string;
}

export interface Question {
  questionId: number;
  questionType: 'MCQ' | 'SCENARIO' | 'CODING' | 'DESIGN';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  maxScore: number;
  orderNum: number;
  questionText: string;
  options: string[] | null;
  createdAt: string;
  submittedAnswer?: SubmittedAnswerInfo | null;
}

export interface StudentAnswer {
  answerId: number;
  questionId: number;
  userId: number;
  userAnswer: string;
  score: number;
  aiFeedback: string;
  submittedAt: string;
}

export interface DashboardStats {
  pathId: number;
  domain: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctCount: number;
  correctRate: number;
  weeklyProgress: WeeklyProgress[];
  typeAccuracy: TypeAccuracy[];
  weaknessAnalysis: WeaknessAnalysis;
}

export interface WeeklyProgress {
  weekNumber: number;
  status: string;
  questionCount: number;
  correctCount: number;
  correctRate: number;
}

export interface TypeAccuracy {
  questionType: string;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
}

export interface WeaknessAnalysis {
  totalWeak: number;
  weakTags: string[];
  feedbackList?: FeedbackItem[];
}

export interface FeedbackItem {
  questionText: string;
  feedback: string;
  isCorrect: boolean;
  score: number;
  maxScore: number;
}

export interface CreateLearningPathRequest {
  userId: number;
  domain: string;
}

export interface SubmitAnswerRequest {
  userId: number;
  answer: string;
}

