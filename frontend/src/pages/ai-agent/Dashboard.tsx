import { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * AI 에이전트 대시보드
 */
export default function AIAgentDashboard() {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'applications' | 'growth' | 'resume' | 'company'>('recommendations');

  return (
    <div className="min-h-screen bg-gray-50">
      

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI 커리어 에이전트</h1>
          <p className="mt-2 text-gray-600">
            AI가 당신의 커리어 성장을 24시간 지원합니다
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`${
                activeTab === 'recommendations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              📋 채용 공고 추천
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`${
                activeTab === 'applications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              📊 지원 현황
            </button>
            <button
              onClick={() => setActiveTab('growth')}
              className={`${
                activeTab === 'growth'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              📈 커리어 성장
            </button>
            <button
              onClick={() => setActiveTab('resume')}
              className={`${
                activeTab === 'resume'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              📝 이력서 최적화
            </button>
            <button
              onClick={() => setActiveTab('company')}
              className={`${
                activeTab === 'company'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              🏢 목표 기업 분석
            </button>
          </nav>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'recommendations' && <JobRecommendationsTab />}
          {activeTab === 'applications' && <ApplicationsTab />}
          {activeTab === 'growth' && <CareerGrowthTab />}
          {activeTab === 'resume' && <ResumeOptimizerTab />}
          {activeTab === 'company' && <CompanyTalentTab />}
        </div>
      </main>
    </div>
  );
}

// ============== 1. 채용 공고 추천 탭 ==============

function JobRecommendationsTab() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">AI 채용 공고 추천</h2>
      <p className="text-gray-600 mb-6">
        당신의 커리어 분석 결과를 기반으로 최적의 채용 공고를 추천합니다.
      </p>

      {/* 추천 공고 목록 */}
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">시니어 백엔드 개발자</h3>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  매칭률 92%
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">테크 스타트업 | 서울 강남</p>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Spring Boot</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Kubernetes</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">MSA</span>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                <strong>추천 이유:</strong> 귀하의 백엔드 개발 경험과 MSA 아키텍처 경험이 이 포지션에 완벽하게 부합합니다.
              </p>
            </div>
            <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              지원하기
            </button>
          </div>
        </div>

        {/* 추가 공고는 API 연동 후 동적으로 표시 */}
        <div className="text-center py-8 text-gray-500">
          <p>AI가 분석 중입니다...</p>
          <p className="text-sm mt-2">커리어 분석을 완료하면 맞춤 공고가 표시됩니다.</p>
          <Link to="/career-chat" className="inline-block mt-4 text-blue-600 hover:underline">
            커리어 분석 시작하기 →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============== 2. 지원 현황 탭 ==============

function ApplicationsTab() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">지원 현황 추적</h2>
      <p className="text-gray-600 mb-6">
        지원한 공고의 진행 상황을 확인하고 다음 액션을 제안받으세요.
      </p>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">총 지원</p>
          <p className="text-2xl font-bold text-blue-600">0건</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">서류 통과</p>
          <p className="text-2xl font-bold text-green-600">0건</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">면접 진행</p>
          <p className="text-2xl font-bold text-yellow-600">0건</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">최종 합격</p>
          <p className="text-2xl font-bold text-purple-600">0건</p>
        </div>
      </div>

      {/* 다음 액션 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-2">⚡ AI 추천 다음 액션</h3>
        <ul className="space-y-2 text-sm">
          <li className="text-gray-700">• 아직 지원 내역이 없습니다. 추천 공고를 확인해보세요!</li>
        </ul>
      </div>

      {/* 지원 내역 */}
      <div className="text-center py-8 text-gray-500">
        <p>아직 지원한 공고가 없습니다</p>
        <Link to="#" className="inline-block mt-4 text-blue-600 hover:underline">
          추천 공고 보기 →
          </Link>
      </div>
    </div>
  );
}

// ============== 3. 커리어 성장 탭 ==============

function CareerGrowthTab() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">커리어 성장 경로</h2>
      <p className="text-gray-600 mb-6">
        현재 위치에서 목표 포지션까지의 성장 경로를 AI가 분석합니다.
      </p>

      {/* 목표 설정 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold mb-4">🎯 목표 포지션 설정</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              현재 포지션
            </label>
            <input
              type="text"
              placeholder="예: 주니어 백엔드 개발자"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              목표 포지션
            </label>
            <input
              type="text"
              placeholder="예: 시니어 풀스택 개발자"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          AI 성장 경로 분석
        </button>
      </div>

      {/* 갭 분석 결과 (예시) */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold mb-4">📊 갭 분석 결과</h3>
        <p className="text-gray-600 mb-4">
          목표 포지션을 설정하면 부족한 스킬과 경험을 분석해드립니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">부족한 스킬</p>
            <p className="text-lg font-semibold">-</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">예상 기간</p>
            <p className="text-lg font-semibold">-</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">난이도</p>
            <p className="text-lg font-semibold">-</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== 4. 이력서 최적화 탭 ==============

// ============== 5. 목표 기업 분석 탭 ==============

function CompanyTalentTab() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">목표 기업 인재상 분석</h2>
      <p className="text-gray-600 mb-6">
        가고 싶은 기업의 인재상을 분석하고 나와의 매칭도를 확인하세요.
      </p>

      {/* 기능 소개 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl mb-2">🔍</div>
          <h3 className="font-semibold text-blue-900 mb-1">인재상 분석</h3>
          <p className="text-sm text-blue-700">기업이 원하는 인재 특성, 핵심가치 파악</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl mb-2">📋</div>
          <h3 className="font-semibold text-green-900 mb-1">채용 요건 분석</h3>
          <p className="text-sm text-green-700">필수/우대 조건, 기술스택 정리</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl mb-2">📊</div>
          <h3 className="font-semibold text-purple-900 mb-1">매칭도 분석</h3>
          <p className="text-sm text-purple-700">나와 기업의 적합도 점수 확인</p>
        </div>
      </div>

      {/* CTA 버튼 */}
      <div className="text-center py-6">
        <Link
          to="/company-talent"
          className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <span>목표 기업 분석 시작하기</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}

function ResumeOptimizerTab() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">이력서 최적화</h2>
      <p className="text-gray-600 mb-6">
        AI가 이력서를 분석하고 ATS 통과율을 높이는 방법을 제안합니다.
      </p>

      {/* 이력서 업로드 */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-gray-600 mb-2">이력서를 업로드하거나 내용을 입력하세요</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          파일 선택
        </button>
      </div>

      {/* ATS 점수 (예시) */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <h3 className="font-semibold mb-4">🎯 ATS 통과 점수</h3>
        <div className="flex items-center gap-4">
          <div className="text-5xl font-bold text-green-600">-</div>
          <div className="flex-1">
            <p className="text-gray-700">이력서를 업로드하면 점수가 표시됩니다</p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full">
              <div className="h-2 bg-green-500 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>

        {/* 개선 제안 */}
        <div className="mt-6">
          <h4 className="font-semibold mb-2">💡 AI 개선 제안</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• 이력서를 분석하면 개선 제안이 표시됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
