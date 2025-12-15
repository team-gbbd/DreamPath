import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PYTHON_AI_SERVICE_URL } from '@/lib/api';

interface CrawlResult {
  success: boolean;
  siteName: string;
  searchKeyword?: string;
  totalResults: number;
  jobListings: any[];
  savedToDatabase?: number;
  savedCompanies?: number;
  fromCache?: boolean;
}

const CrawlerPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedSite, setSelectedSite] = useState('wanted');
  const [searchKeyword, setSearchKeyword] = useState('개발자');
  const [maxResults, setMaxResults] = useState(20);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(true);

  // Theme 객체
  const theme = {
    bg: darkMode ? "bg-[#0B0D14]" : "bg-gradient-to-br from-slate-50 via-white to-slate-100",
    text: darkMode ? "text-white" : "text-slate-900",
    textMuted: darkMode ? "text-white/60" : "text-slate-600",
    textSubtle: darkMode ? "text-white/40" : "text-slate-500",
    card: darkMode
      ? "bg-white/[0.03] border-white/[0.08]"
      : "bg-white border-slate-200 shadow-sm",
    cardHover: darkMode
      ? "hover:bg-white/[0.06] hover:border-white/[0.15]"
      : "hover:shadow-md hover:border-slate-300",
    input: darkMode
      ? "bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/40 focus:border-[#5A7BFF] focus:ring-[#5A7BFF]/20"
      : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#5A7BFF] focus:ring-[#5A7BFF]/20",
    sectionBg: darkMode
      ? "bg-white/[0.02] border-white/[0.06]"
      : "bg-white/70 backdrop-blur-sm border-slate-200/50 shadow-sm",
    button: {
      primary: "bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white hover:opacity-90",
      secondary: darkMode
        ? "bg-white/[0.05] text-white/80 hover:bg-white/[0.1] border border-white/[0.1]"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200",
      site: {
        active: "bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white shadow-lg shadow-purple-500/20",
        inactive: darkMode
          ? "bg-white/[0.05] text-white/60 hover:bg-white/[0.1] border border-white/[0.1]"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
      }
    },
    divider: darkMode ? "border-white/[0.06]" : "border-slate-200",
  };

  useEffect(() => {
    // 테마 로드
    const savedTheme = localStorage.getItem('dreampath:theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    }

    // 테마 변경 이벤트 리스너
    const handleThemeChange = () => {
      const t = localStorage.getItem('dreampath:theme');
      setDarkMode(t === 'dark');
    };

    window.addEventListener('dreampath-theme-change', handleThemeChange);
    return () => window.removeEventListener('dreampath-theme-change', handleThemeChange);
  }, []);

  const handleCrawl = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let response;

      if (selectedSite === 'wanted') {
        response = await axios.post(`${PYTHON_AI_SERVICE_URL}/api/job-sites/crawl/wanted`, {
          searchKeyword,
          maxResults,
          forceRefresh: true
        }, {
          timeout: 120000
        });
      } else if (selectedSite === 'jobkorea') {
        response = await axios.post(`${PYTHON_AI_SERVICE_URL}/api/job-sites/crawl`, {
          siteName: 'jobkorea',
          siteUrl: `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(searchKeyword)}&menucode=local`,
          searchKeyword,
          maxResults,
          forceRefresh: true
        }, {
          timeout: 120000
        });
      } else if (selectedSite === 'saramin') {
        response = await axios.post(`${PYTHON_AI_SERVICE_URL}/api/job-sites/crawl`, {
          siteName: 'saramin',
          siteUrl: `https://www.saramin.co.kr/zf_user/search?searchword=${encodeURIComponent(searchKeyword)}`,
          searchKeyword,
          maxResults,
          forceRefresh: true
        }, {
          timeout: 120000
        });
      }

      if (response?.data) {
        setResult(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || '크롤링 실패');
      console.error('크롤링 에러:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg} relative`}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-[#5A7BFF]/10" : "bg-[#5A7BFF]/20"}`} />
        <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-[#8F5CFF]/10" : "bg-[#8F5CFF]/20"}`} />
      </div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
            : "linear-gradient(rgba(90,123,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(90,123,255,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 py-4 sm:py-6 lg:py-8 pb-8 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <i className="ri-search-eye-line text-white text-xl sm:text-2xl"></i>
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>채용정보 크롤러</h1>
                <p className={`text-sm sm:text-base ${theme.textMuted}`}>채용 사이트에서 공고와 기업 정보를 수집합니다</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className={`${theme.button.secondary} px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-2 text-sm sm:text-base`}
            >
              <i className="ri-arrow-left-line"></i>
              <span className="hidden sm:inline">대시보드로</span>
            </button>
          </div>

          {/* 크롤링 설정 */}
          <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6 mb-4 sm:mb-6`}>
            <h2 className={`text-lg sm:text-xl font-bold ${theme.text} mb-4 sm:mb-6 flex items-center`}>
              <i className={`ri-settings-4-line mr-2 ${darkMode ? 'text-[#5A7BFF]' : 'text-[#5A7BFF]'}`}></i>
              크롤링 설정
            </h2>

            <div className="space-y-4 sm:space-y-6">
              {/* 사이트 선택 */}
              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-2 sm:mb-3`}>
                  채용 사이트
                </label>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={() => setSelectedSite('wanted')}
                    className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${
                      selectedSite === 'wanted'
                        ? theme.button.site.active
                        : theme.button.site.inactive
                    }`}
                  >
                    원티드
                  </button>
                  <button
                    onClick={() => setSelectedSite('jobkorea')}
                    className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${
                      selectedSite === 'jobkorea'
                        ? theme.button.site.active
                        : theme.button.site.inactive
                    }`}
                  >
                    잡코리아
                  </button>
                  <button
                    onClick={() => setSelectedSite('saramin')}
                    className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${
                      selectedSite === 'saramin'
                        ? theme.button.site.active
                        : theme.button.site.inactive
                    }`}
                  >
                    사람인
                  </button>
                </div>
              </div>

              {/* 검색 키워드 */}
              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                  검색 키워드
                </label>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className={`w-full px-4 py-2.5 sm:py-3 ${theme.input} border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 text-sm sm:text-base transition-all`}
                  placeholder="예: 개발자, 백엔드, 프론트엔드"
                />
              </div>

              {/* 최대 결과 수 */}
              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                  최대 결과 수
                </label>
                <input
                  type="number"
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  className={`w-full px-4 py-2.5 sm:py-3 ${theme.input} border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 text-sm sm:text-base transition-all`}
                  min="1"
                  max="100"
                />
              </div>

              {/* 크롤링 버튼 */}
              <button
                onClick={handleCrawl}
                disabled={loading}
                className={`w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-white transition-all text-sm sm:text-base ${
                  loading
                    ? 'bg-slate-400 cursor-not-allowed'
                    : theme.button.primary
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-loader-4-line animate-spin"></i>
                    크롤링 중...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-search-line"></i>
                    크롤링 시작
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className={`${darkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'} border rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6`}>
              <div className="flex items-start gap-3">
                <i className={`ri-error-warning-line text-xl sm:text-2xl ${darkMode ? 'text-red-400' : 'text-red-600'}`}></i>
                <div>
                  <h3 className={`text-sm sm:text-base font-semibold ${darkMode ? 'text-red-400' : 'text-red-800'}`}>크롤링 실패</h3>
                  <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'} mt-1`}>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 결과 */}
          {result && (
            <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
              <h2 className={`text-lg sm:text-xl font-bold ${theme.text} mb-4 sm:mb-6 flex items-center`}>
                <i className={`ri-bar-chart-box-line mr-2 ${darkMode ? 'text-[#5A7BFF]' : 'text-[#5A7BFF]'}`}></i>
                크롤링 결과
              </h2>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className={`${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'} rounded-lg sm:rounded-xl p-3 sm:p-4`}>
                  <div className={`text-xs sm:text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>채용공고</div>
                  <div className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-900'} mt-1`}>
                    {result.jobListings?.length || 0}개
                  </div>
                </div>

                <div className={`${darkMode ? 'bg-green-500/10' : 'bg-green-50'} rounded-lg sm:rounded-xl p-3 sm:p-4`}>
                  <div className={`text-xs sm:text-sm ${darkMode ? 'text-green-400' : 'text-green-600'} font-medium`}>DB 저장</div>
                  <div className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-900'} mt-1`}>
                    {result.savedToDatabase || 0}개
                  </div>
                </div>

                <div className={`${darkMode ? 'bg-purple-500/10' : 'bg-purple-50'} rounded-lg sm:rounded-xl p-3 sm:p-4`}>
                  <div className={`text-xs sm:text-sm ${darkMode ? 'text-purple-400' : 'text-purple-600'} font-medium`}>기업정보</div>
                  <div className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-900'} mt-1`}>
                    {result.savedCompanies || 0}개
                  </div>
                </div>

                <div className={`${darkMode ? 'bg-white/[0.05]' : 'bg-slate-100'} rounded-lg sm:rounded-xl p-3 sm:p-4`}>
                  <div className={`text-xs sm:text-sm ${theme.textMuted} font-medium`}>캐시</div>
                  <div className={`text-xl sm:text-2xl font-bold ${theme.text} mt-1`}>
                    {result.fromCache ? '사용' : '신규'}
                  </div>
                </div>
              </div>

              {/* 공고 목록 미리보기 */}
              {result.jobListings && result.jobListings.length > 0 && (
                <div>
                  <h3 className={`text-base sm:text-lg font-semibold ${theme.text} mb-3 sm:mb-4`}>
                    채용공고 미리보기 (최근 5개)
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    {result.jobListings.slice(0, 5).map((job, index) => (
                      <div
                        key={index}
                        className={`${theme.card} border rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all ${theme.cardHover}`}
                      >
                        <h4 className={`font-medium ${theme.text} text-sm sm:text-base`}>{job.title}</h4>
                        <p className={`text-xs sm:text-sm ${theme.textMuted} mt-1`}>{job.company}</p>
                        <div className={`flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm ${theme.textSubtle}`}>
                          {job.location && <span className="flex items-center gap-1"><i className="ri-map-pin-line"></i> {job.location}</span>}
                          {job.experience && <span className="flex items-center gap-1"><i className="ri-briefcase-line"></i> {job.experience}</span>}
                          {job.salary && <span className="flex items-center gap-1"><i className="ri-money-dollar-circle-line"></i> {job.salary}</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 전체 보기 링크 */}
                  <div className="mt-4 sm:mt-6 text-center">
                    <a
                      href="/job-listings"
                      className={`inline-flex items-center ${darkMode ? 'text-[#5A7BFF] hover:text-[#8F5CFF]' : 'text-[#5A7BFF] hover:text-[#8F5CFF]'} font-medium text-sm sm:text-base transition-colors`}
                    >
                      전체 채용공고 보기
                      <i className="ri-arrow-right-s-line ml-1"></i>
                    </a>
                  </div>
                </div>
              )}

              {/* 기업정보 보기 링크 */}
              {result.savedCompanies && result.savedCompanies > 0 && (
                <div className={`mt-4 sm:mt-6 pt-4 sm:pt-6 border-t ${theme.divider}`}>
                  <a
                    href="/company-list"
                    className={`inline-flex items-center ${darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-800'} font-medium text-sm sm:text-base transition-colors`}
                  >
                    <i className="ri-building-line mr-2"></i>
                    수집된 기업정보 보기 ({result.savedCompanies}개)
                    <i className="ri-arrow-right-s-line ml-1"></i>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrawlerPage;