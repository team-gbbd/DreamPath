import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  vision?: string;
  benefits?: string;
  culture?: string;
  average_salary?: string;
  company_type?: string;
  revenue?: string;
  ceo_name?: string;
  capital?: string;
  homepage_url?: string;
  recruitment_url?: string;
  logo_url?: string;
  crawled_at: string;
  created_at: string;
  updated_at: string;
}

interface ThemeColors {
  bg: string;
  card: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  divider: string;
  iconColor: string;
  sectionBg: string;
}

const CompanyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dreampath:theme") === "dark";
    }
    return false;
  });
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

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
    if (id) {
      fetchCompanyDetail();
    }
  }, [id]);

  const theme: ThemeColors = darkMode ? {
    bg: "bg-[#0B0D14]",
    card: "bg-white/[0.02] border-white/[0.08]",
    text: "text-white",
    textMuted: "text-white/70",
    textSubtle: "text-white/50",
    border: "border-white/[0.08]",
    divider: "border-white/[0.06]",
    iconColor: "text-white/40",
    sectionBg: "bg-white/[0.02]",
  } : {
    bg: "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
    card: "bg-white border-slate-200",
    text: "text-slate-900",
    textMuted: "text-slate-600",
    textSubtle: "text-slate-500",
    border: "border-slate-200",
    divider: "border-slate-100",
    iconColor: "text-slate-400",
    sectionBg: "bg-slate-50",
  };

  const fetchCompanyDetail = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${PYTHON_AI_SERVICE_URL}/api/company/${id}`);

      if (response.data.success) {
        setCompany(response.data.company);
      }
    } catch (error) {
      console.error('기업 상세 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSiteLabel = (siteName: string) => {
    const siteLabels: { [key: string]: string } = {
      wanted: '원티드',
      jobkorea: '잡코리아',
      saramin: '사람인',
    };
    return siteLabels[siteName] || siteName;
  };

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

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg} relative flex items-center justify-center`}>
        <BackgroundEffects />
        <div className="relative z-10 text-center">
          <div className={`inline-block animate-spin rounded-full h-12 w-12 border-4 border-t-transparent ${
            darkMode ? "border-blue-500" : "border-blue-600"
          }`}></div>
          <p className={`mt-4 ${theme.textMuted}`}>로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className={`min-h-screen ${theme.bg} relative flex items-center justify-center`}>
        <BackgroundEffects />
        <div className="relative z-10 text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            darkMode ? "bg-slate-500/10" : "bg-slate-100"
          }`}>
            <svg className={`w-8 h-8 ${theme.textSubtle}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className={theme.textMuted}>기업 정보를 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate('/company-list')}
            className={`mt-4 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
              darkMode
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            }`}
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} relative`}>
      <BackgroundEffects />

      <div className="relative z-10 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* 뒤로 가기 버튼 */}
          <button
            onClick={() => navigate('/company-list')}
            className={`mb-6 flex items-center transition-colors ${
              darkMode ? "text-white/60 hover:text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            목록으로 돌아가기
          </button>

          {/* 기업 정보 카드 */}
          <div className={`rounded-2xl border backdrop-blur-sm overflow-hidden ${theme.card}`}>
            {/* 헤더 */}
            <div className={`p-6 sm:p-8 ${
              darkMode
                ? "bg-gradient-to-r from-blue-600/30 to-indigo-600/30"
                : "bg-gradient-to-r from-blue-600 to-indigo-600"
            }`}>
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div>
                  <div className="mb-3">
                    <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                      darkMode ? "bg-white/10 text-white/90" : "bg-white/20 text-white"
                    }`}>
                      {getSiteLabel(company.site_name)}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{company.company_name}</h1>
                  {company.industry && (
                    <p className={darkMode ? "text-white/70" : "text-blue-100"}>{company.industry}</p>
                  )}
                </div>
                {company.logo_url && (
                  <img
                    src={company.logo_url}
                    alt={company.company_name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white object-contain p-2"
                  />
                )}
              </div>
            </div>

            {/* 기본 정보 */}
            <div className={`p-6 sm:p-8 border-b ${theme.divider}`}>
              <h2 className={`text-lg sm:text-xl font-semibold ${theme.text} mb-4`}>기본 정보</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {company.company_type && (
                  <div className="flex items-start">
                    <svg className={`w-5 h-5 ${theme.iconColor} mt-0.5 mr-3 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <div>
                      <p className={`text-sm ${theme.textSubtle}`}>기업구분</p>
                      <p className={theme.text}>{company.company_type}</p>
                    </div>
                  </div>
                )}

                {company.location && (
                  <div className="flex items-start">
                    <svg className={`w-5 h-5 ${theme.iconColor} mt-0.5 mr-3 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <div>
                      <p className={`text-sm ${theme.textSubtle}`}>위치</p>
                      <p className={theme.text}>{company.location}</p>
                    </div>
                  </div>
                )}

                {company.established_year && (
                  <div className="flex items-start">
                    <svg className={`w-5 h-5 ${theme.iconColor} mt-0.5 mr-3 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className={`text-sm ${theme.textSubtle}`}>설립일</p>
                      <p className={theme.text}>{company.established_year}</p>
                    </div>
                  </div>
                )}

                {company.employee_count && (
                  <div className="flex items-start">
                    <svg className={`w-5 h-5 ${theme.iconColor} mt-0.5 mr-3 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div>
                      <p className={`text-sm ${theme.textSubtle}`}>사원수</p>
                      <p className={theme.text}>{company.employee_count}</p>
                    </div>
                  </div>
                )}

                {company.ceo_name && (
                  <div className="flex items-start">
                    <svg className={`w-5 h-5 ${theme.iconColor} mt-0.5 mr-3 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div>
                      <p className={`text-sm ${theme.textSubtle}`}>대표자</p>
                      <p className={theme.text}>{company.ceo_name}</p>
                    </div>
                  </div>
                )}

                {company.capital && (
                  <div className="flex items-start">
                    <svg className={`w-5 h-5 ${theme.iconColor} mt-0.5 mr-3 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className={`text-sm ${theme.textSubtle}`}>자본금</p>
                      <p className={theme.text}>{company.capital}</p>
                    </div>
                  </div>
                )}

                {company.revenue && (
                  <div className="flex items-start">
                    <svg className={`w-5 h-5 ${theme.iconColor} mt-0.5 mr-3 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <div>
                      <p className={`text-sm ${theme.textSubtle}`}>매출액</p>
                      <p className={theme.text}>{company.revenue}</p>
                    </div>
                  </div>
                )}

                {company.average_salary && (
                  <div className="flex items-start">
                    <svg className={`w-5 h-5 ${theme.iconColor} mt-0.5 mr-3 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div>
                      <p className={`text-sm ${theme.textSubtle}`}>대졸초임</p>
                      <p className={theme.text}>{company.average_salary}</p>
                    </div>
                  </div>
                )}

                {company.address && (
                  <div className="flex items-start sm:col-span-2">
                    <svg className={`w-5 h-5 ${theme.iconColor} mt-0.5 mr-3 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <div>
                      <p className={`text-sm ${theme.textSubtle}`}>주소</p>
                      <p className={theme.text}>{company.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 회사 소개 */}
            {company.description && (
              <div className={`p-6 sm:p-8 border-b ${theme.divider}`}>
                <h2 className={`text-lg sm:text-xl font-semibold ${theme.text} mb-4`}>회사 소개</h2>
                <p className={`${theme.textMuted} whitespace-pre-line leading-relaxed`}>{company.description}</p>
              </div>
            )}

            {/* 비전 */}
            {company.vision && (
              <div className={`p-6 sm:p-8 border-b ${theme.divider}`}>
                <h2 className={`text-lg sm:text-xl font-semibold ${theme.text} mb-4`}>비전 / 미션</h2>
                <p className={`${theme.textMuted} whitespace-pre-line leading-relaxed`}>{company.vision}</p>
              </div>
            )}

            {/* 복지 */}
            {company.benefits && (
              <div className={`p-6 sm:p-8 border-b ${theme.divider}`}>
                <h2 className={`text-lg sm:text-xl font-semibold ${theme.text} mb-4`}>복지 / 혜택</h2>
                <p className={`${theme.textMuted} whitespace-pre-line leading-relaxed`}>{company.benefits}</p>
              </div>
            )}

            {/* 기업문화 */}
            {company.culture && (
              <div className={`p-6 sm:p-8 border-b ${theme.divider}`}>
                <h2 className={`text-lg sm:text-xl font-semibold ${theme.text} mb-4`}>기업 문화</h2>
                <p className={`${theme.textMuted} whitespace-pre-line leading-relaxed`}>{company.culture}</p>
              </div>
            )}

            {/* 링크 */}
            <div className={`p-6 sm:p-8 ${theme.sectionBg}`}>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                {company.homepage_url && (
                  <a
                    href={company.homepage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all duration-200 ${
                      darkMode
                        ? "bg-white/[0.05] border border-white/[0.1] text-white hover:bg-white/[0.08]"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    홈페이지 방문
                  </a>
                )}

                {company.recruitment_url && (
                  <a
                    href={company.recruitment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all duration-200 ${
                      darkMode
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/30"
                    }`}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    채용 공고 보기
                  </a>
                )}
              </div>

              <div className={`mt-4 text-xs ${theme.textSubtle}`}>
                최종 업데이트: {new Date(company.updated_at).toLocaleDateString('ko-KR')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailPage;