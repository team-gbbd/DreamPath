import MajorRecommendPanel from "@/components/profile/MajorRecommendPanel";

const MajorRecommend = () => (
  <div className="min-h-screen bg-gray-50 py-10">
    <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow">
      <header className="mb-8 border-b pb-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
          DreamPath Major Recommendation
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">AI 학과 추천</h1>
        <p className="mt-2 text-gray-600">사용자 벡터 ID를 기반으로 CareerNet 학과 데이터를 추천합니다.</p>
      </header>

      <MajorRecommendPanel />
    </div>
  </div>
);

export default MajorRecommend;
