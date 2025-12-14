import api from "@/lib/api";

export async function fetchHybridJobs(vectorId: string, topK: number = 20, analysisData?: any, userId?: number, profileUpdatedAt?: string) {
  if (analysisData) {
    // Parse personality if needed
    let personalityMap: Record<string, number> = {};
    const rawPersonality = analysisData.personality;

    try {
      const parsed = typeof rawPersonality === 'string' ? JSON.parse(rawPersonality) : rawPersonality;
      // Handle big_five or direct structure
      const traits = parsed?.big_five || parsed?.bigFive || parsed?.traits || parsed;
      if (traits) {
        // Extract numbers. If nested {score: 50}, extract score.
        Object.entries(traits).forEach(([k, v]) => {
          if (typeof v === 'number') personalityMap[k] = v;
          else if (typeof v === 'object' && v !== null && 'score' in v) {
            personalityMap[k] = Number((v as any).score) || 50;
          }
        });
      }
    } catch (e) { console.warn("Personality parse error", e); }

    const payload: any = {
      summary: analysisData.summary || "",
      goals: analysisData.goals || [],
      values: analysisData.valuesList || [], // Use valuesList (text) not values (scores)
      personality: personalityMap,
      strengths: analysisData.strengths || [],
      risks: analysisData.risks || []
    };

    // Add cache key fields if available
    if (userId) payload.userId = userId;
    if (profileUpdatedAt) payload.profileUpdatedAt = profileUpdatedAt;

    const res = await api.post(`/recommendation/run`, payload);
    // If response has "jobs" key (new agent), return that list.
    if (res.data && Array.isArray(res.data.jobs)) {
      return res.data.jobs;
    }
    return res.data;
  }

  // Legacy Fallback
  const res = await api.get(`/recommend/hybrid`, {
    params: { vectorId, topK },
  });
  return res.data.recommended;
}

export async function fetchMajors(vectorId: string, analysisData?: any, userId?: number, profileUpdatedAt?: string) {
  if (analysisData) {
    // Re-use logic or duplicate payload construction?
    // For speed, let's call fetchHybridJobs internally or duplicate?
    // Let's copy payload logic for safety and clarity.
    let personalityMap: Record<string, number> = {};
    const rawPersonality = analysisData.personality;
    try {
      const parsed = typeof rawPersonality === 'string' ? JSON.parse(rawPersonality) : rawPersonality;
      const traits = parsed?.big_five || parsed?.bigFive || parsed?.traits || parsed;
      if (traits) {
        Object.entries(traits).forEach(([k, v]) => {
          if (typeof v === 'number') personalityMap[k] = v;
          else if (typeof v === 'object' && v !== null && 'score' in v) {
            personalityMap[k] = Number((v as any).score) || 50;
          }
        });
      }
    } catch (e) { }

    const payload: any = {
      summary: analysisData.summary || "",
      goals: analysisData.goals || [],
      values: analysisData.valuesList || [],
      personality: personalityMap,
      strengths: analysisData.strengths || [],
      risks: analysisData.risks || []
    };

    // Add cache key fields if available
    if (userId) payload.userId = userId;
    if (profileUpdatedAt) payload.profileUpdatedAt = profileUpdatedAt;

    // We call the SAME endpoint, but we extract MAJORS.
    const res = await api.post(`/recommendation/run`, payload);
    if (res.data && Array.isArray(res.data.majors)) {
      return res.data.majors;
    }
    return []; // Fallback empty if key missing
  }

  // Legacy
  const res = await api.post(`/recommend/majors`, { vectorId });
  return res.data;
}
