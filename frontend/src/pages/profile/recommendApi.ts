import api from "@/lib/api";

export async function fetchHybridJobs(vectorId: string, topK: number = 20) {
  const res = await api.get(`/recommend/hybrid`, {
    params: { vectorId, topK },
  });
  return res.data.recommended;
}
