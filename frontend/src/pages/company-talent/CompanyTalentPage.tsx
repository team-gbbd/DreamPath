import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/feature/Footer';
import { companyTalentService } from '../../lib/api';

/**
 * 목표 기업 인재상 분석 페이지
 * 구직자가 목표 기업의 인재상을 파악하고 자신과의 매칭도를 분석
 */

// 타입 정의
interface IdealCandidate {
  summary: string;
  coreValues: string[];
  keyTraits: string[];
}

interface RequirementCategory {
  category: string;
  items: string[];
}

interface Requirements {
  essential: RequirementCategory[];
  preferred: RequirementCategory[];
}

interface CompanyCulture {
  workStyle: string;
  environment: string;
  growthOpportunity: string;
  keywords: string[];
}

interface HiringTrends {
  mainPositions: string[];
  techFocus: string[];
  industryPosition: string;
}

interface TalentAnalysis {
  idealCandidate: IdealCandidate;
  requirements: Requirements;
  companyCulture: CompanyCulture;
  hiringTrends: HiringTrends;
  interviewTips: string[];
}

interface StrengthMatch {
  area: string;
  match: string;
  score: number;
}

interface GapItem {
  area: string;
  gap: string;
  priority: string;
}

interface ActionItem {
  action: string;
  reason: string;
  timeline: string;
}

interface FitAssessment {
  cultureFit: string;
  skillFit: string;
  growthPotential: string;
}

interface UserMatching {
  overallMatchScore: number;
  matchSummary: string;
  strengthMatches: StrengthMatch[];
  gapAnalysis: GapItem[];
  actionItems: ActionItem[];
  fitAssessment: FitAssessment;
}

interface CompanyInfo {
  companyName?: string;
  industry?: string;
  employeeCount?: string;
  companyType?: string;
  address?: string;
  homepageUrl?: string;
}

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location?: string;
  url?: string;
}

interface AnalysisResult {
  companyName: string;
  companyInfo: CompanyInfo;
  talentAnalysis: TalentAnalysis;
  userMatching: UserMatching | null;
  jobPostings: JobPosting[];
  analyzedAt: string;
}

export default function CompanyTalentPage() {
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'talent' | 'requirements' | 'culture' | 'matching'>('talent');

  // localStorage에서 커리어 분석 결과 가져오기
  const [careerAnalysis, setCareerAnalysis] = useState<any>(null);

  useEffect(() => {
    const savedAnalysis = localStorage.getItem('careerAnalysis');
    if (savedAnalysis) {
      try {
        setCareerAnalysis(JSON.parse(savedAnalysis));
      } catch (e) {
        console.error('커리어 분석 결과 파싱 실패:', e);
      }
    }
  }, []);

  // 기업 인재상 분석 실행
  const handleAnalyze = async () => {
    if (!companyName.trim()) {
      setError('기업명을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await companyTalentService.analyzeCompanyTalent(
        companyName,
        null, // userProfile
        careerAnalysis // 커리어 분석 결과가 있으면 매칭 분석도 수행
      );

      if (response.success) {
        setAnalysisResult(response.data);
      } else {
        setError(response.error || '분석에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '분석 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">목표 기업 인재상 분석</h1>
          <p className="mt-2 text-gray-600">
            가고 싶은 기업의 인재상을 분석하고 나와의 매칭도를 확인하세요
          </p>
        </div>

        {/* 검색 섹션 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                분석할 기업명
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder="예: 카카오, 네이버, 삼성전자..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    분석 중...
                  </span>
                ) : '분석하기'}
              </button>
            </div>
          </div>

          {/* 커리어 분석 상태 알림 */}
          {careerAnalysis ? (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              커리어 분석 결과가 있어 매칭 분석이 함께 제공됩니다.
            </div>
          ) : (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              <Link to="/career-chat" className="underline hover:no-underline">커리어 분석</Link>을 먼저 완료하면 나와의 매칭도도 분석해드립니다.
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* 분석 결과 */}
        {analysisResult && (
          <div className="space-y-6">
            {/* 기업 기본 정보 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {analysisResult.companyName}
                  </h2>
                  {analysisResult.companyInfo && (
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                      {analysisResult.companyInfo.industry && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          {analysisResult.companyInfo.industry}
                        </span>
                      )}
                      {analysisResult.companyInfo.companyType && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          {analysisResult.companyInfo.companyType}
                        </span>
                      )}
                      {analysisResult.companyInfo.employeeCount && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                          직원 {analysisResult.companyInfo.employeeCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 매칭 점수 */}
                {analysisResult.userMatching && (
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600">
                      {analysisResult.userMatching.overallMatchScore}점
                    </div>
                    <p className="text-sm text-gray-500">매칭도</p>
                  </div>
                )}
              </div>

              {/* 인재상 요약 */}
              {analysisResult.talentAnalysis?.idealCandidate?.summary && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">이 기업이 원하는 인재</h3>
                  <p className="text-blue-800">
                    {analysisResult.talentAnalysis.idealCandidate.summary}
                  </p>
                </div>
              )}
            </div>

            {/* 탭 네비게이션 */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex">
                  <button
                    onClick={() => setActiveTab('talent')}
                    className={`${
                      activeTab === 'talent'
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    } flex-1 py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    인재상
                  </button>
                  <button
                    onClick={() => setActiveTab('requirements')}
                    className={`${
                      activeTab === 'requirements'
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    } flex-1 py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    채용 요건
                  </button>
                  <button
                    onClick={() => setActiveTab('culture')}
                    className={`${
                      activeTab === 'culture'
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    } flex-1 py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    기업문화
                  </button>
                  {analysisResult.userMatching && (
                    <button
                      onClick={() => setActiveTab('matching')}
                      className={`${
                        activeTab === 'matching'
                          ? 'border-blue-500 text-blue-600 bg-blue-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      } flex-1 py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                      나와의 매칭
                    </button>
                  )}
                </nav>
              </div>

              {/* 탭 컨텐츠 */}
              <div className="p-6">
                {activeTab === 'talent' && (
                  <TalentTab analysis={analysisResult.talentAnalysis} />
                )}
                {activeTab === 'requirements' && (
                  <RequirementsTab analysis={analysisResult.talentAnalysis} />
                )}
                {activeTab === 'culture' && (
                  <CultureTab
                    analysis={analysisResult.talentAnalysis}
                    jobPostings={analysisResult.jobPostings}
                  />
                )}
                {activeTab === 'matching' && analysisResult.userMatching && (
                  <MatchingTab matching={analysisResult.userMatching} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* 분석 전 안내 */}
        {!analysisResult && !isLoading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              목표 기업을 검색해보세요
            </h3>
            <p className="text-gray-600 mb-6">
              관심 있는 기업명을 입력하면 해당 기업의 인재상, 채용 기준, 문화를 분석해드립니다.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['카카오', '네이버', '삼성전자', '현대자동차', 'SK', 'LG'].map((name) => (
                <button
                  key={name}
                  onClick={() => setCompanyName(name)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors text-sm"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

// ============== 인재상 탭 ==============
function TalentTab({ analysis }: { analysis: TalentAnalysis }) {
  const { idealCandidate, hiringTrends, interviewTips } = analysis;

  return (
    <div className="space-y-6">
      {/* 핵심 가치 */}
      {idealCandidate?.coreValues?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">핵심 가치</h3>
          <div className="flex flex-wrap gap-2">
            {idealCandidate.coreValues.map((value, idx) => (
              <span
                key={idx}
                className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium"
              >
                {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 원하는 인재 특성 */}
      {idealCandidate?.keyTraits?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">원하는 인재 특성</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {idealCandidate.keyTraits.map((trait, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-green-500">✓</span>
                <span>{trait}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 채용 트렌드 */}
      {hiringTrends && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">채용 트렌드</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hiringTrends.mainPositions?.length > 0 && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">주요 채용 포지션</p>
                <ul className="space-y-1">
                  {hiringTrends.mainPositions.map((pos, idx) => (
                    <li key={idx} className="text-purple-800 text-sm">• {pos}</li>
                  ))}
                </ul>
              </div>
            )}
            {hiringTrends.techFocus?.length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">주력 기술</p>
                <ul className="space-y-1">
                  {hiringTrends.techFocus.map((tech, idx) => (
                    <li key={idx} className="text-green-800 text-sm">• {tech}</li>
                  ))}
                </ul>
              </div>
            )}
            {hiringTrends.industryPosition && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">업계 포지션</p>
                <p className="text-orange-800 text-sm">{hiringTrends.industryPosition}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 면접 팁 */}
      {interviewTips?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">면접 준비 팁</h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <ul className="space-y-2">
              {interviewTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-yellow-900">
                  <span className="text-yellow-500 mt-0.5">💡</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== 채용 요건 탭 ==============
function RequirementsTab({ analysis }: { analysis: TalentAnalysis }) {
  const { requirements } = analysis;

  return (
    <div className="space-y-6">
      {/* 필수 요건 */}
      {requirements?.essential?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-red-500">*</span> 필수 요건
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requirements.essential.map((req, idx) => (
              <div key={idx} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h4 className="font-medium text-red-900 mb-2">{req.category}</h4>
                <ul className="space-y-1">
                  {req.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="text-red-800 text-sm flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 우대 사항 */}
      {requirements?.preferred?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">우대 사항</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requirements.preferred.map((req, idx) => (
              <div key={idx} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="font-medium text-blue-900 mb-2">{req.category}</h4>
                <ul className="space-y-1">
                  {req.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="text-blue-800 text-sm flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============== 기업문화 탭 ==============
function CultureTab({
  analysis,
  jobPostings
}: {
  analysis: TalentAnalysis;
  jobPostings: JobPosting[];
}) {
  const { companyCulture } = analysis;

  return (
    <div className="space-y-6">
      {/* 문화 키워드 */}
      {companyCulture?.keywords?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">문화 키워드</h3>
          <div className="flex flex-wrap gap-2">
            {companyCulture.keywords.map((keyword, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
              >
                #{keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 상세 문화 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {companyCulture?.workStyle && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              💼 업무 스타일
            </h4>
            <p className="text-gray-700 text-sm">{companyCulture.workStyle}</p>
          </div>
        )}
        {companyCulture?.environment && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              🏢 근무 환경
            </h4>
            <p className="text-gray-700 text-sm">{companyCulture.environment}</p>
          </div>
        )}
        {companyCulture?.growthOpportunity && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              📈 성장 기회
            </h4>
            <p className="text-gray-700 text-sm">{companyCulture.growthOpportunity}</p>
          </div>
        )}
      </div>

      {/* 최근 채용공고 */}
      {jobPostings?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">최근 채용공고</h3>
          <div className="space-y-3">
            {jobPostings.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h4 className="font-medium text-gray-900">{job.title}</h4>
                  <p className="text-sm text-gray-500">
                    {job.company} {job.location && `| ${job.location}`}
                  </p>
                </div>
                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    상세보기 →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============== 매칭 분석 탭 ==============
function MatchingTab({ matching }: { matching: UserMatching }) {
  return (
    <div className="space-y-6">
      {/* 매칭 요약 */}
      <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="text-5xl font-bold text-blue-600 mb-2">
          {matching.overallMatchScore}점
        </div>
        <p className="text-gray-700">{matching.matchSummary}</p>
      </div>

      {/* 강점 매칭 */}
      {matching.strengthMatches?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-green-500">✓</span> 나의 강점
          </h3>
          <div className="space-y-3">
            {matching.strengthMatches.map((strength, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-green-900">{strength.area}</h4>
                  <p className="text-sm text-green-700">{strength.match}</p>
                </div>
                <div className="text-2xl font-bold text-green-600">{strength.score}점</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 갭 분석 */}
      {matching.gapAnalysis?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-yellow-500">⚠</span> 보완이 필요한 영역
          </h3>
          <div className="space-y-3">
            {matching.gapAnalysis.map((gap, idx) => (
              <div key={idx} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-yellow-900">{gap.area}</h4>
                  <span className={`px-2 py-1 text-xs rounded ${
                    gap.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                    gap.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {gap.priority === 'HIGH' ? '우선순위 높음' :
                     gap.priority === 'MEDIUM' ? '우선순위 중간' : '우선순위 낮음'}
                  </span>
                </div>
                <p className="text-sm text-yellow-800">{gap.gap}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 액션 아이템 */}
      {matching.actionItems?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-blue-500">📋</span> 준비해야 할 것
          </h3>
          <div className="space-y-3">
            {matching.actionItems.map((item, idx) => (
              <div key={idx} className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900">{item.action}</h4>
                    <p className="text-sm text-blue-700 mt-1">{item.reason}</p>
                  </div>
                  {item.timeline && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm whitespace-nowrap">
                      {item.timeline}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 적합도 평가 */}
      {matching.fitAssessment && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">적합도 평가</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">문화 적합도</h4>
              <p className="text-sm text-gray-700">{matching.fitAssessment.cultureFit}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">역량 적합도</h4>
              <p className="text-sm text-gray-700">{matching.fitAssessment.skillFit}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">성장 가능성</h4>
              <p className="text-sm text-gray-700">{matching.fitAssessment.growthPotential}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
