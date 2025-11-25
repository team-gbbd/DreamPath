import WorknetRecommendPanel from "@/components/profile/WorknetRecommendPanel";

const RecruitRecommend = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow">
        <header className="mb-8 border-b pb-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
            DreamPath Recruit Recommendation
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">AI 채용 추천</h1>
          <p className="mt-2 text-gray-600">사용자 벡터 ID를 기반으로 WorkNet 채용 정보를 추천합니다.</p>
        </header>

        <WorknetRecommendPanel />
      </div>
    </div>
  );
};

export default RecruitRecommend;
