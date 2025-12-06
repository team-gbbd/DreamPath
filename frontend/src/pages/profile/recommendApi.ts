import { pythonApi } from "@/lib/api";

export async function fetchHybridJobs(vectorId: string, topK: number = 10) {
  const res = await pythonApi.get(`/recommend/hybrid`, {
    params: { user_vector_id: vectorId, top_k: topK },
  });

  // Python API now returns array directly
  return res.data.recommended;
}

export async function fetchMajors(vectorId: string) {
  const res = await pythonApi.post("/recommend/majors", { vectorId });
  return res.data;
}
