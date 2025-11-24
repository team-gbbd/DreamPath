import HybridJobRecommendPanel from "@/components/profile/HybridJobRecommendPanel";

const JobRecommend = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow">
        <header className="mb-10 border-b pb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
            DreamPath Recommendation
          </p>
          <h1 className="mt-2 text-4xl font-bold text-gray-900">AI 직업 추천</h1>
          <p className="mt-3 text-gray-600">
            벡터 검색 + LLM 재정렬을 결합한 하이브리드 엔진으로, 사용자 성향에 맞는 직업을 제안합니다.
          </p>
        </header>

        <HybridJobRecommendPanel />
      </div>
    </div>
  );
};

export default JobRecommend;
