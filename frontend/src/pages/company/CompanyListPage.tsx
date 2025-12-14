import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PYTHON_AI_SERVICE_URL } from '@/lib/api';

interface Company {
  id: number;
  site_name: string;
  company_id: string;
  company_name: string;
  industry?: string;
  established_year?: string;
  employee_count?: string;
  location?: string;
  address?: string;
  description?: string;
  benefits?: string;
  homepage_url?: string;
  recruitment_url?: string;
  logo_url?: string;
  created_at: string;
}

interface CompanyListResponse {
  success: boolean;
  total: number;
  companies: Company[];
  page: number;
  page_size: number;
}

interface ThemeColors {
  bg: string;
  card: string;
  cardHover: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  divider: string;
  input: string;
  inputBorder: string;
  inputFocus: string;
  badge: string;
  badgeText: string;
  modalOverlay: string;
  modalBg: string;
}

const CompanyListPage = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dreampath:theme") === "dark";
    }
    return false;
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [siteFilter, setSiteFilter] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [showCrawlModal, setShowCrawlModal] = useState(false);
  const [crawlSite, setCrawlSite] = useState('wanted');
  const [crawlKeyword, setCrawlKeyword] = useState('개발자');
  const [crawlMaxResults, setCrawlMaxResults] = useState(20);

  // Theme sync
  useEffect(() => {
    const handleThemeChange = () => {
      setDarkMode(localStorage.getItem("dreampath:theme") === "dark");
    };
    window.addEventListener("dreampath-theme-change", handleThemeChange);
    window.addEventListener("storage", handleThemeChange);
    return () => {
      window.removeEventListener("dreampath-theme-change", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [page, siteFilter, searchKeyword]);

  const theme: ThemeColors = darkMode ? {
    bg: "bg-[#0B0D14]",
    card: "bg-white/[0.02] border-white/[0.08]",
    cardHover: "hover:bg-white/[0.04] hover:border-white/[0.12]",
    text: "text-white",
    textMuted: "text-white/70",
    textSubtle: "text-white/50",
    border: "border-white/[0.08]",
    divider: "border-white/[0.06]",
    input: "bg-white/[0.03] border-white/[0.1] text-white placeholder:text-white/40",
    inputBorder: "border-white/[0.1]",
    inputFocus: "focus:ring-blue-500/50 focus:border-blue-500/50",
    badge: "bg-blue-500/20",
    badgeText: "text-blue-300",
    modalOverlay: "bg-black/70",
    modalBg: "bg-[#12141C] border-white/[0.1]",
  } : {
    bg: "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
    card: "bg-white border-slate-200",
    cardHover: "hover:bg-slate-50 hover:border-slate-300",
    text: "text-slate-900",
    textMuted: "text-slate-600",
    textSubtle: "text-slate-500",
    border: "border-slate-200",
    divider: "border-slate-100",
    input: "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400",
    inputBorder: "border-slate-300",
    inputFocus: "focus:ring-blue-500 focus:border-blue-500",
    badge: "bg-blue-100",
    badgeText: "text-blue-800",
    modalOverlay: "bg-black/50",
    modalBg: "bg-white border-slate-200",
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      let url = `${PYTHON_AI_SERVICE_URL}/api/company/list?page=${page}&page_size=${pageSize}`;

      if (siteFilter) {
        url += `&site_name=${siteFilter}`;
      }

      const response = await axios.get<CompanyListResponse>(url);

      if (response.data.success) {
        setCompanies(response.data.companies);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('기업 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) {
      setSearchKeyword('');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(
        `${PYTHON_AI_SERVICE_URL}/api/company/search/by-name?name=${searchInput}&page=${page}&page_size=${pageSize}`
      );

      if (response.data.success) {
        setCompanies(response.data.companies);
        setTotal(response.data.total);
        setSearchKeyword(searchInput);
      }
    } catch (error) {
      console.error('기업 검색 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyClick = (companyId: number) => {
    navigate(`/company/${companyId}`);
  };

  const getSiteLabel = (siteName: string) => {
    const siteLabels: { [key: string]: string } = {
      wanted: '원티드',
      jobkorea: '잡코리아',
      saramin: '사람인',
    };
    return siteLabels[siteName] || siteName;
  };

  const getSiteBadgeColors = (siteName: string) => {
    if (darkMode) {
      const colors: { [key: string]: string } = {
        wanted: 'bg-blue-500/20 text-blue-300',
        jobkorea: 'bg-green-500/20 text-green-300',
        saramin: 'bg-purple-500/20 text-purple-300',
      };
      return colors[siteName] || 'bg-slate-500/20 text-slate-300';
    } else {
      const colors: { [key: string]: string } = {
        wanted: 'bg-blue-100 text-blue-700',
        jobkorea: 'bg-green-100 text-green-700',
        saramin: 'bg-purple-100 text-purple-700',
      };
      return colors[siteName] || 'bg-slate-100 text-slate-700';
    }
  };

  const handleCrawl = async () => {
    setCrawling(true);
    try {
      let response;

      if (crawlSite === 'wanted') {
        response = await axios.post(`${PYTHON_AI_SERVICE_URL}/api/job-sites/crawl/wanted`, {
          searchKeyword: crawlKeyword,
          maxResults: crawlMaxResults,
          forceRefresh: true
        }, { timeout: 120000 });
      } else if (crawlSite === 'jobkorea') {
        response = await axios.post(`${PYTHON_AI_SERVICE_URL}/api/job-sites/crawl`, {
          siteName: 'jobkorea',
          siteUrl: `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(crawlKeyword)}&menucode=local`,
          searchKeyword: crawlKeyword,
          maxResults: crawlMaxResults,
          forceRefresh: true
        }, { timeout: 120000 });
      } else if (crawlSite === 'saramin') {
        response = await axios.post(`${PYTHON_AI_SERVICE_URL}/api/job-sites/crawl`, {
          siteName: 'saramin',
          siteUrl: `https://www.saramin.co.kr/zf_user/search?searchword=${encodeURIComponent(crawlKeyword)}`,
          searchKeyword: crawlKeyword,
          maxResults: crawlMaxResults,
          forceRefresh: true
        }, { timeout: 120000 });
      }

      if (response?.data) {
        alert(`크롤링 완료!\n채용공고: ${response.data.jobListings?.length || 0}개\n기업정보: ${response.data.savedCompanies || 0}개`);
        setShowCrawlModal(false);
        fetchCompanies();
      }
    } catch (error: any) {
      alert('크롤링 실패: ' + (error.response?.data?.detail || error.message));
    } finally {
      setCrawling(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  // Background Effects Component
  const BackgroundEffects = () => (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${
          darkMode ? "bg-blue-500/10" : "bg-blue-400/20"
        }`} />
        <div className={`absolute bottom-1/4 left-0 w-[400px] h-[400px] rounded-full blur-[100px] ${
          darkMode ? "bg-indigo-500/8" : "bg-indigo-400/15"
        }`} />
        <div className={`absolute top-1/2 right-0 w-[300px] h-[300px] rounded-full blur-[80px] ${
          darkMode ? "bg-cyan-500/6" : "bg-cyan-400/10"
        }`} />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
            : "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </>
  );

  return (
    <div className={`min-h-screen ${theme.bg} relative`}>
      <BackgroundEffects />

      <div className="relative z-10 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text} mb-2`}>
                기업 정보
              </h1>
              <p className={theme.textMuted}>
                다양한 기업의 정보를 확인하세요
              </p>
            </div>
            <button
              onClick={() => setShowCrawlModal(true)}
              className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                darkMode
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/30"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              기업정보 크롤링
            </button>
          </div>

          {/* 필터 및 검색 */}
          <div className={`rounded-2xl border backdrop-blur-sm p-4 sm:p-6 mb-6 ${theme.card}`}>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* 사이트 필터 */}
              <div className="flex-1">
                <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
                  채용 사이트
                </label>
                <select
                  value={siteFilter}
                  onChange={(e) => {
                    setSiteFilter(e.target.value);
                    setPage(1);
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl border ${theme.input} ${theme.inputFocus} focus:ring-2 focus:outline-none transition-all`}
                >
                  <option value="">전체</option>
                  <option value="wanted">원티드</option>
                  <option value="jobkorea">잡코리아</option>
                  <option value="saramin">사람인</option>
                </select>
              </div>

              {/* 검색 */}
              <div className="flex-1 lg:flex-[2]">
                <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
                  회사명 검색
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="회사명을 입력하세요"
                    className={`flex-1 px-4 py-2.5 rounded-xl border ${theme.input} ${theme.inputFocus} focus:ring-2 focus:outline-none transition-all`}
                  />
                  <button
                    onClick={handleSearch}
                    className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                      darkMode
                        ? "bg-blue-600 hover:bg-blue-500 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    검색
                  </button>
                </div>
              </div>
            </div>

            {/* 검색 결과 정보 */}
            <div className={`mt-4 text-sm ${theme.textMuted}`}>
              총 <span className={`font-semibold ${theme.text}`}>{total}</span>개의 기업
              {searchKeyword && (
                <>
                  {' '}- 검색어: <span className="font-semibold text-blue-500">{searchKeyword}</span>
                  <button
                    onClick={() => {
                      setSearchKeyword('');
                      setSearchInput('');
                      setPage(1);
                    }}
                    className="ml-2 text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    (초기화)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 기업 목록 */}
          {loading ? (
            <div className="text-center py-12 sm:py-16">
              <div className={`inline-block animate-spin rounded-full h-12 w-12 border-4 border-t-transparent ${
                darkMode ? "border-blue-500" : "border-blue-600"
              }`}></div>
              <p className={`mt-4 ${theme.textMuted}`}>로딩 중...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className={`rounded-2xl border backdrop-blur-sm p-8 sm:p-12 text-center ${theme.card}`}>
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                darkMode ? "bg-slate-500/10" : "bg-slate-100"
              }`}>
                <svg className={`w-8 h-8 ${theme.textSubtle}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className={theme.textMuted}>등록된 기업이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {companies.map((company) => (
                <div
                  key={company.id}
                  onClick={() => handleCompanyClick(company.id)}
                  className={`rounded-2xl border backdrop-blur-sm p-5 sm:p-6 transition-all duration-200 cursor-pointer ${theme.card} ${theme.cardHover}`}
                >
                  {/* 사이트 배지 */}
                  <div className="mb-3">
                    <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getSiteBadgeColors(company.site_name)}`}>
                      {getSiteLabel(company.site_name)}
                    </span>
                  </div>

                  {/* 회사명 */}
                  <h3 className={`text-lg font-semibold ${theme.text} mb-2 line-clamp-2`}>
                    {company.company_name}
                  </h3>

                  {/* 위치 */}
                  {company.location && (
                    <div className={`flex items-center text-sm ${theme.textMuted} mb-2`}>
                      <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{company.location}</span>
                    </div>
                  )}

                  {/* 설명 */}
                  {company.description && (
                    <p className={`text-sm ${theme.textMuted} line-clamp-3 mb-4`}>
                      {company.description}
                    </p>
                  )}

                  {/* 추가 정보 */}
                  <div className={`text-xs ${theme.textSubtle} space-y-1`}>
                    {company.industry && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">업종:</span> {company.industry}
                      </div>
                    )}
                    {company.employee_count && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">직원수:</span> {company.employee_count}
                      </div>
                    )}
                    {company.established_year && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">설립:</span> {company.established_year}
                      </div>
                    )}
                  </div>

                  {/* 링크 버튼 */}
                  {(company.homepage_url || company.recruitment_url) && (
                    <div className={`mt-4 pt-4 border-t ${theme.divider} flex gap-3`}>
                      {company.homepage_url && (
                        <a
                          href={company.homepage_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          홈페이지
                        </a>
                      )}
                      {company.recruitment_url && (
                        <a
                          href={company.recruitment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          채용공고
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 페이지네이션 */}
          {!loading && totalPages > 1 && (
            <div className="mt-6 sm:mt-8 flex justify-center items-center gap-2 flex-wrap">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className={`px-3 sm:px-4 py-2 rounded-xl border font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode
                    ? "border-white/[0.1] text-white/70 hover:bg-white/[0.05]"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                이전
              </button>

              <div className="flex gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = idx + 1;
                  } else if (page <= 3) {
                    pageNum = idx + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + idx;
                  } else {
                    pageNum = page - 2 + idx;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-xl font-medium transition-all duration-200 ${
                        page === pageNum
                          ? darkMode
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30"
                          : darkMode
                            ? "border border-white/[0.1] text-white/70 hover:bg-white/[0.05]"
                            : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className={`px-3 sm:px-4 py-2 rounded-xl border font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode
                    ? "border-white/[0.1] text-white/70 hover:bg-white/[0.05]"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                다음
              </button>
            </div>
          )}

          {/* 크롤링 모달 */}
          {showCrawlModal && (
            <div className={`fixed inset-0 ${theme.modalOverlay} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
              <div className={`rounded-2xl border p-6 max-w-md w-full ${theme.modalBg}`}>
                <h2 className={`text-xl font-bold ${theme.text} mb-4`}>기업정보 크롤링</h2>

                <div className="space-y-4">
                  {/* 사이트 선택 */}
                  <div>
                    <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
                      사이트 선택
                    </label>
                    <div className="flex gap-2">
                      {['wanted', 'jobkorea', 'saramin'].map((site) => (
                        <button
                          key={site}
                          onClick={() => setCrawlSite(site)}
                          className={`flex-1 px-3 py-2 rounded-xl font-medium transition-all duration-200 ${
                            crawlSite === site
                              ? darkMode
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                              : darkMode
                                ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.08]"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {getSiteLabel(site)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 검색 키워드 */}
                  <div>
                    <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
                      검색 키워드
                    </label>
                    <input
                      type="text"
                      value={crawlKeyword}
                      onChange={(e) => setCrawlKeyword(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border ${theme.input} ${theme.inputFocus} focus:ring-2 focus:outline-none transition-all`}
                      placeholder="예: 개발자, 백엔드"
                    />
                  </div>

                  {/* 최대 결과 수 */}
                  <div>
                    <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
                      최대 결과 수
                    </label>
                    <input
                      type="number"
                      value={crawlMaxResults}
                      onChange={(e) => setCrawlMaxResults(Number(e.target.value))}
                      className={`w-full px-4 py-2.5 rounded-xl border ${theme.input} ${theme.inputFocus} focus:ring-2 focus:outline-none transition-all`}
                      min="1"
                      max="100"
                    />
                  </div>

                  {/* 버튼 */}
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowCrawlModal(false)}
                      disabled={crawling}
                      className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 ${
                        darkMode
                          ? "border border-white/[0.1] text-white/70 hover:bg-white/[0.05]"
                          : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      취소
                    </button>
                    <button
                      onClick={handleCrawl}
                      disabled={crawling}
                      className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 ${
                        darkMode
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                      }`}
                    >
                      {crawling ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          크롤링 중...
                        </span>
                      ) : '시작'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyListPage;