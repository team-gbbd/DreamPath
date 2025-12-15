import { pythonApi } from '@/lib/api';

interface RecommendationPayload {
  userId?: number;
  profileUpdatedAt?: string;
  summary?: string;
  goals?: string[];
  values?: string[];
  personality?: Record<string, number>;
  strengths?: string[];
  risks?: string[];
}

interface JobRecommendation {
  title: string;
  score?: number;
  matchScore?: number;
  explanation?: string;
  category?: string;
  metadata?: Record<string, any>;
}

interface MajorRecommendation {
  title: string;
  score?: number;
  matchScore?: number;
  explanation?: string;
  category?: string;
  metadata?: Record<string, any>;
}

interface RecommendationResult {
  jobs: JobRecommendation[];
  majors: MajorRecommendation[];
}

/**
 * Run comprehensive recommendation based on user profile analysis
 * Uses personality, values, and goals to recommend jobs and majors
 */
export async function runRecommendation(payload: RecommendationPayload): Promise<RecommendationResult> {
  const { userId, personality, values, goals, strengths, summary } = payload;

  // Build vector ID from userId if available
  const vectorId = userId ? `user_${userId}` : undefined;

  // Parallel fetch for jobs and majors
  const [jobsResponse, majorsResponse] = await Promise.all([
    // Fetch hybrid job recommendations
    vectorId
      ? pythonApi.get('/recommend/hybrid', { params: { user_vector_id: vectorId, top_k: 20 } })
          .catch(() => ({ data: { recommended: [] } }))
      : Promise.resolve({ data: { recommended: [] } }),

    // Fetch major recommendations
    vectorId
      ? pythonApi.post('/recommend/majors', { vectorId })
          .catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] })
  ]);

  // Process job recommendations
  const jobs: JobRecommendation[] = (jobsResponse.data?.recommended || jobsResponse.data || []).map((job: any) => ({
    title: job.title || job.metadata?.jobName || job.metadata?.title || '직업',
    score: job.score,
    matchScore: job.matchScore || (job.score ? Math.round(job.score * 100) : undefined),
    explanation: job.explanation || job.metadata?.explanation || job.matchReason,
    category: job.category || job.metadata?.job_category || job.metadata?.category,
    metadata: job.metadata || job
  }));

  // Process major recommendations
  const majors: MajorRecommendation[] = (Array.isArray(majorsResponse.data) ? majorsResponse.data : []).map((major: any) => ({
    title: major.title || major.metadata?.deptName || major.metadata?.mClass || major.metadata?.majorName || '학과',
    score: major.score,
    matchScore: major.matchScore || (major.score ? Math.round(major.score * 100) : undefined),
    explanation: major.explanation || major.metadata?.explanation,
    category: major.category || major.metadata?.lClass || major.metadata?.field,
    metadata: major.metadata || major
  }));

  return { jobs, majors };
}
