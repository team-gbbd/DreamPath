export interface NormalizedItem {
    title: string;
    matchScore: number;
    explanation: string;
    metadata: Record<string, any>;
    [key: string]: any;
}

export interface RecommendationResult {
    jobs: NormalizedItem[];
    majors: NormalizedItem[];
    [key: string]: any;
}

const parseScoreValue = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const parsed = parseFloat(value.trim());
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
};

const resolveMatchScore = (...candidates: any[]): number => {
    for (const candidate of candidates) {
        const parsed = parseScoreValue(candidate);
        if (parsed !== null) {
            const normalized = parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
            return Math.round(normalized);
        }
    }
    return 0;
};

function safeParseMeta(meta: any): Record<string, any> {
    if (!meta) return {};
    if (typeof meta === 'object') return meta;
    if (typeof meta === 'string') {
        try {
            const parsed = JSON.parse(meta);
            return typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }
    return {};
}

/**
 * Normalizes backend recommendation data into a standard frontend format.
 * Ensures Title, MatchScore (0-100), Explanation, and parsed Metadata are always present.
 */
export function normalizeRecommendationData(result: any): RecommendationResult {
    if (!result) return { jobs: [], majors: [] };

    const jobsRaw = Array.isArray(result.jobs) ? result.jobs : [];
    const majorsRaw = Array.isArray(result.majors) ? result.majors : [];
    const jobExplanations = result.jobExplanations || result.job_explanations || [];
    const majorExplanations = result.majorExplanations || result.major_explanations || [];

    const jobs = jobsRaw.map((job: any, index: number) => {
        const meta = safeParseMeta(job.metadata);

        // Title Coalescing
        // Priority: job.title (already normalized?) -> job.jobName -> metadata
        const title = job.title || job.jobName || job.job_name || meta.jobName || meta.title || "제목 미확인";

        // Score Normalization
        const matchScore = resolveMatchScore(
            job.matchScore,
            job.match_score,
            job.match,
            job.score,
            meta.matchScore,
            meta.match,
            meta.score
        );

        // Explanation Merging
        const explanation = job.explanation || jobExplanations[index] || job.reason || meta.summary || meta.description || meta.reason || "AI 추천 결과입니다.";

        return {
            ...job,
            title,
            matchScore,
            explanation,
            metadata: meta
        };
    });

    const majors = majorsRaw.map((major: any, index: number) => {
        const meta = safeParseMeta(major.metadata);

        const title = major.title || major.name || major.majorName || major.major_name || meta.deptName || meta.title || "학과명 미확인";

        const matchScore = resolveMatchScore(
            major.matchScore,
            major.match_score,
            major.match,
            major.score,
            meta.matchScore,
            meta.match,
            meta.score
        );

        const explanation = major.explanation || majorExplanations[index] || major.reason || meta.summary || meta.description || meta.reason || "AI 추천 결과입니다.";

        return {
            ...major,
            title,
            matchScore,
            explanation,
            metadata: meta
        };
    });

    // Sort by score descending (optional, but good for consistency)
    jobs.sort((a, b) => b.matchScore - a.matchScore);
    majors.sort((a, b) => b.matchScore - a.matchScore);

    return {
        ...result,
        jobs,
        majors
    };
}
