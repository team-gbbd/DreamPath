import { backendApi } from "@/lib/api";

export async function runRecommendation(profile) {
  const res = await backendApi.post("/recommendation/run", profile);
  return res.data;
}
