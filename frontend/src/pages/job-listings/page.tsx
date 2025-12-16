import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Briefcase, Search, CloudDownload, ExternalLink, Building2, MapPin, DollarSign, ChevronLeft, ChevronRight, Inbox, AlertCircle } from 'lucide-react';
import { jobSiteService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { JobListing, CrawlResponse, CareerRecommendation } from '@/types';

interface ThemeColors {
  bg: string;
  headerBg: string;
  headerBorder: string;
  card: string;
  cardBorder: string;
  cardHover: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  input: string;
  inputBorder: string;
  inputFocus: string;
  border: string;
  divider: string;
  tabBg: string;
  tabActive: string;
  tabInactive: string;
  badge: string;
  badgeText: string;
}

export default function JobListingsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dreampath:theme") === "dark";
    }
    return false;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [results, setResults] = useState<CrawlResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPages, setCurrentPages] = useState<{ [key: string]: number }>({});
  const [activeTab, setActiveTab] = useState<'all' | 'wanted' | 'saramin' | 'jobkorea'>('all');
  const itemsPerPage = 10;
  const maxResults = 1000;

  const careerRecommendations = location.state?.careerRecommendations as CareerRecommendation[] | undefined;

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

  const theme: ThemeColors = darkMode ? {
    bg: "bg-[#0B0D14]",
    headerBg: "bg-[#0B0D14]/95 backdrop-blur-xl",
    headerBorder: "border-white/[0.06]",
    card: "bg-white/[0.02]",
    cardBorder: "border-white/[0.08]",
    cardHover: "hover:bg-white/[0.04]",
    text: "text-white",
    textMuted: "text-white/70",
    textSubtle: "text-white/50",
    input: "bg-white/[0.03] border-white/[0.1] text-white placeholder:text-white/40",
    inputBorder: "border-white/[0.1]",
    inputFocus: "focus:border-violet-500/50 focus:ring-violet-500/20",
    border: "border-white/[0.08]",
    divider: "border-white/[0.06]",
    tabBg: "bg-white/[0.02]",
    tabActive: "text-violet-400",
    tabInactive: "text-white/50 hover:text-white/70",
    badge: "bg-white/[0.08]",
    badgeText: "text-white/60",
  } : {
    bg: "bg-slate-100",
    headerBg: "bg-white/80 backdrop-blur-xl",
    headerBorder: "border-gray-200/50",
    card: "bg-white",
    cardBorder: "border-gray-200",
    cardHover: "hover:shadow-lg",
    text: "text-gray-900",
    textMuted: "text-gray-600",
    textSubtle: "text-gray-500",
    input: "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400",
    inputBorder: "border-gray-300",
    inputFocus: "focus:border-primary focus:ring-primary/20",
    border: "border-gray-200",
    divider: "border-gray-100",
    tabBg: "bg-gray-50",
    tabActive: "text-primary",
    tabInactive: "text-gray-600 hover:text-gray-800",
    badge: "bg-gray-100",
    badgeText: "text-gray-600",
  };

  useEffect(() => {
    if (careerRecommendations && careerRecommendations.length > 0) {
      const firstCareer = careerRecommendations[0];
      setSearchKeyword(firstCareer.careerName);
      handleSearch(firstCareer.careerName);
    } else {
      loadAllJobListings();
    }
  }, [careerRecommendations]);

  const loadAllJobListings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [wantedResult, saraminResult, jobkoreaResult] = await Promise.all([
        jobSiteService.searchJobListings('wanted', undefined, 100000),
        jobSiteService.searchJobListings('saramin', undefined, 100000),
        jobSiteService.searchJobListings('jobkorea', undefined, 100000)
      ]);

      const allResults: CrawlResponse[] = [];
      if (wantedResult.success && wantedResult.totalResults > 0) {
        allResults.push(wantedResult);
      }
      if (saraminResult.success && saraminResult.totalResults > 0) {
        allResults.push(saraminResult);
      }
      if (jobkoreaResult.success && jobkoreaResult.totalResults > 0) {
        allResults.push(jobkoreaResult);
      }

      if (allResults.length > 0) {
        setResults(allResults);
        setCurrentPages({ all: 1, wanted: 1, saramin: 1, jobkorea: 1 });
      }
    } catch (err: any) {
      console.error('공고 로드 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (keyword?: string) => {
    const searchTerm = keyword || searchKeyword;
    if (!searchTerm.trim()) {
      setError('검색 키워드를 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [wantedResult, saraminResult, jobkoreaResult] = await Promise.all([
        jobSiteService.searchJobListings('wanted', searchTerm, 100000),
        jobSiteService.searchJobListings('saramin', searchTerm, 100000),
        jobSiteService.searchJobListings('jobkorea', searchTerm, 100000)
      ]);

      const allResults: CrawlResponse[] = [];
      if (wantedResult.success && wantedResult.totalResults > 0) {
        allResults.push(wantedResult);
      }
      if (saraminResult.success && saraminResult.totalResults > 0) {
        allResults.push(saraminResult);
      }
      if (jobkoreaResult.success && jobkoreaResult.totalResults > 0) {
        allResults.push(jobkoreaResult);
      }

      if (allResults.length > 0) {
        setResults(allResults);
        setCurrentPages({ all: 1, wanted: 1, saramin: 1, jobkorea: 1 });
      } else {
        setError('검색 결과가 없습니다. "크롤링 시작" 버튼을 눌러 최신 채용 정보를 가져오세요.');
      }
    } catch (err: any) {
      console.error('검색 실패:', err);
      setError(err.message || '채용 정보를 검색하는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrawl = async () => {
    const keyword = searchKeyword.trim() || undefined;

    try {
      setIsLoading(true);
      setError(null);

      await Promise.all([
        jobSiteService.crawlWanted(keyword, maxResults, true),
        jobSiteService.crawlJobSite('saramin', 'https://www.saramin.co.kr', keyword, maxResults, true),
        jobSiteService.crawlJobSite('jobkorea', 'https://www.jobkorea.co.kr', keyword, maxResults, true)
      ]);

      if (keyword) {
        setSearchKeyword(keyword);
        await handleSearch(keyword);
      } else {
        await loadAllJobListings();
      }

    } catch (err: any) {
      console.error('크롤링 실패:', err);
      setError(err.message || '크롤링에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // Background Effects
  const BackgroundEffects = () => (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-0 right-1/4 rounded-full ${
            darkMode ? "bg-violet-500/10" : "bg-violet-400/15"
          }`}
          style={{ width: 'min(60vw, 600px)', height: 'min(60vw, 600px)', filter: 'blur(150px)' }}
        />
        <div
          className={`absolute bottom-1/4 left-0 rounded-full ${
            darkMode ? "bg-blue-500/8" : "bg-blue-400/15"
          }`}
          style={{ width: 'min(50vw, 500px)', height: 'min(50vw, 500px)', filter: 'blur(120px)' }}
        />
        <div
          className={`absolute top-1/2 right-0 rounded-full ${
            darkMode ? "bg-cyan-500/6" : "bg-cyan-400/10"
          }`}
          style={{ width: 'min(40vw, 400px)', height: 'min(40vw, 400px)', filter: 'blur(100px)' }}
        />
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

  // Site name mapping
  const siteNameMap: {[key: string]: string} = {
    'wanted': '원티드',
    'saramin': '사람인',
    'jobkorea': '잡코리아'
  };

  // Tab data preparation
  const wantedResult = results.find(r => r.site === 'wanted' || r.site === '원티드');
  const saraminResult = results.find(r => r.site === 'saramin' || r.site === '사람인');
  const jobkoreaResult = results.find(r => r.site === 'jobkorea' || r.site === '잡코리아');

  const allJobListings: JobListing[] = [];
  if (wantedResult?.jobListings) allJobListings.push(...wantedResult.jobListings);
  if (saraminResult?.jobListings) allJobListings.push(...saraminResult.jobListings);
  if (jobkoreaResult?.jobListings) allJobListings.push(...jobkoreaResult.jobListings);

  const getCurrentData = () => {
    if (activeTab === 'all') {
      return {
        jobListings: allJobListings,
        totalResults: allJobListings.length,
        site: '종합보기',
        searchUrl: undefined
      };
    } else if (activeTab === 'wanted') {
      return {
        jobListings: wantedResult?.jobListings || [],
        totalResults: wantedResult?.totalResults || 0,
        site: siteNameMap[wantedResult?.site || 'wanted'] || '원티드',
        searchUrl: wantedResult?.searchUrl
      };
    } else if (activeTab === 'saramin') {
      return {
        jobListings: saraminResult?.jobListings || [],
        totalResults: saraminResult?.totalResults || 0,
        site: siteNameMap[saraminResult?.site || 'saramin'] || '사람인',
        searchUrl: saraminResult?.searchUrl
      };
    }
    return {
      jobListings: jobkoreaResult?.jobListings || [],
      totalResults: jobkoreaResult?.totalResults || 0,
      site: siteNameMap[jobkoreaResult?.site || 'jobkorea'] || '잡코리아',
      searchUrl: jobkoreaResult?.searchUrl
    };
  };

  const currentData = getCurrentData();
  const currentPage = currentPages[activeTab] || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedJobs = currentData.jobListings.slice(startIndex, endIndex);
  const totalPages = Math.ceil(currentData.jobListings.length / itemsPerPage);

  return (
    <div className={`min-h-screen ${theme.bg} relative px-4 sm:px-6 lg:px-8 py-3`}>
      <BackgroundEffects />

      <div className="max-w-7xl mx-auto">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
              darkMode
                ? "bg-gradient-to-br from-violet-600 to-violet-500 shadow-violet-500/20"
                : "bg-gradient-to-br from-primary to-violet-600 shadow-primary/25"
            )}>
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${theme.text}`}>채용 정보</h1>
              <p className={`text-sm ${theme.textSubtle}`}>추천된 직업에 맞는 채용 공고</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="relative z-10">
        {/* Search Section */}
        <Card className={cn(
          "p-4 sm:p-6 mb-4 sm:mb-6 border shadow-lg",
          darkMode ? "bg-white/[0.02] border-white/[0.08]" : "bg-white border-gray-200"
        )}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>
                  검색 키워드
                </label>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="예: 개발자, 디자이너, 마케터..."
                  className={cn(
                    "w-full px-4 py-3 rounded-xl outline-none transition-all border",
                    theme.input,
                    theme.inputFocus
                  )}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => handleSearch()}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl font-medium",
                    darkMode
                      ? "bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400"
                      : "bg-gradient-to-r from-primary to-violet-600 hover:opacity-90"
                  )}
                  title="DB에 저장된 채용 공고에서 검색 (빠름)"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="hidden sm:inline">검색 중...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      <span>검색</span>
                    </span>
                  )}
                </Button>
                <Button
                  onClick={handleCrawl}
                  disabled={isLoading}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90"
                  title="실시간으로 웹사이트에서 최신 채용 공고 수집 (느림)"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="hidden sm:inline">크롤링 중...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CloudDownload className="h-4 w-4" />
                      <span className="hidden sm:inline">크롤링</span>
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* 추천된 직업 표시 */}
            {careerRecommendations && careerRecommendations.length > 0 && (
              <div className={cn("pt-4 border-t", theme.divider)}>
                <p className={`text-sm mb-2 ${theme.textMuted}`}>추천된 직업:</p>
                <div className="flex flex-wrap gap-2">
                  {careerRecommendations.map((career, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchKeyword(career.careerName);
                        handleSearch(career.careerName);
                      }}
                      className={cn(
                        "px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        darkMode
                          ? "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      {career.careerName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <div className={cn(
            "rounded-xl p-4 mb-4 sm:mb-6 flex items-center gap-3",
            darkMode
              ? "bg-red-500/10 border border-red-500/20"
              : "bg-red-50 border border-red-200"
          )}>
            <AlertCircle className={darkMode ? "text-red-400 h-5 w-5" : "text-red-500 h-5 w-5"} />
            <p className={darkMode ? "text-red-300" : "text-red-700"}>{error}</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Card className={cn(
            "p-4 sm:p-6 border shadow-lg",
            darkMode ? "bg-white/[0.02] border-white/[0.08]" : "bg-white border-gray-200"
          )}>
            {/* 탭 메뉴 */}
            <div className={cn(
              "flex items-center gap-1 sm:gap-2 mb-4 sm:mb-6 border-b overflow-x-auto scrollbar-hide",
              theme.divider
            )}>
              <button
                onClick={() => {
                  setActiveTab('all');
                  setCurrentPages({ ...currentPages, all: 1 });
                }}
                className={cn(
                  "px-3 sm:px-6 py-3 font-medium transition-colors relative whitespace-nowrap text-sm sm:text-base",
                  activeTab === 'all' ? theme.tabActive : theme.tabInactive
                )}
              >
                종합보기
                {allJobListings.length > 0 && (
                  <span className={cn(
                    "ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full",
                    theme.badge, theme.badgeText
                  )}>
                    {allJobListings.length}
                  </span>
                )}
                {activeTab === 'all' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-primary"></div>
                )}
              </button>
              {wantedResult && (
                <button
                  onClick={() => {
                    setActiveTab('wanted');
                    setCurrentPages({ ...currentPages, wanted: 1 });
                  }}
                  className={cn(
                    "px-3 sm:px-6 py-3 font-medium transition-colors relative whitespace-nowrap text-sm sm:text-base",
                    activeTab === 'wanted' ? theme.tabActive : theme.tabInactive
                  )}
                >
                  원티드
                  {wantedResult.totalResults > 0 && (
                    <span className={cn(
                      "ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full",
                      theme.badge, theme.badgeText
                    )}>
                      {wantedResult.totalResults}
                    </span>
                  )}
                  {activeTab === 'wanted' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-primary"></div>
                  )}
                </button>
              )}
              {saraminResult && (
                <button
                  onClick={() => {
                    setActiveTab('saramin');
                    setCurrentPages({ ...currentPages, saramin: 1 });
                  }}
                  className={cn(
                    "px-3 sm:px-6 py-3 font-medium transition-colors relative whitespace-nowrap text-sm sm:text-base",
                    activeTab === 'saramin' ? theme.tabActive : theme.tabInactive
                  )}
                >
                  사람인
                  {saraminResult.totalResults > 0 && (
                    <span className={cn(
                      "ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full",
                      theme.badge, theme.badgeText
                    )}>
                      {saraminResult.totalResults}
                    </span>
                  )}
                  {activeTab === 'saramin' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-primary"></div>
                  )}
                </button>
              )}
              {jobkoreaResult && (
                <button
                  onClick={() => {
                    setActiveTab('jobkorea');
                    setCurrentPages({ ...currentPages, jobkorea: 1 });
                  }}
                  className={cn(
                    "px-3 sm:px-6 py-3 font-medium transition-colors relative whitespace-nowrap text-sm sm:text-base",
                    activeTab === 'jobkorea' ? theme.tabActive : theme.tabInactive
                  )}
                >
                  잡코리아
                  {jobkoreaResult.totalResults > 0 && (
                    <span className={cn(
                      "ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full",
                      theme.badge, theme.badgeText
                    )}>
                      {jobkoreaResult.totalResults}
                    </span>
                  )}
                  {activeTab === 'jobkorea' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-primary"></div>
                  )}
                </button>
              )}
            </div>

            {/* Site Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center",
                  darkMode
                    ? "bg-gradient-to-r from-violet-600 to-violet-500"
                    : "bg-gradient-to-r from-primary to-violet-600"
                )}>
                  <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold ${theme.text}`}>{currentData.site}</h2>
                  <p className={`text-xs sm:text-sm ${theme.textMuted}`}>
                    {wantedResult?.searchKeyword && `"${wantedResult.searchKeyword}" 검색 결과`}
                    {currentData.totalResults > 0 && ` • 총 ${currentData.totalResults}개 공고`}
                  </p>
                </div>
              </div>
              {currentData.searchUrl && (
                <a
                  href={currentData.searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "transition-colors p-2",
                    darkMode ? "text-violet-400 hover:text-violet-300" : "text-primary hover:text-violet-600"
                  )}
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
              )}
            </div>

            {/* Job Listings */}
            {currentData.jobListings && currentData.jobListings.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {paginatedJobs.map((job: JobListing, jobIdx: number) => (
                    <div
                      key={jobIdx}
                      className={cn(
                        "rounded-xl p-4 sm:p-5 cursor-pointer transition-all border",
                        theme.cardBorder,
                        theme.cardHover,
                        darkMode ? "bg-white/[0.02]" : "bg-white"
                      )}
                      onClick={() => window.open(job.url, '_blank')}
                    >
                      <h3 className={`text-base sm:text-lg font-bold mb-3 line-clamp-2 ${theme.text}`}>
                        {job.title}
                      </h3>

                      {job.company && (
                        <div className={`flex items-center text-sm mb-2 ${theme.textMuted}`}>
                          <Building2 className="h-4 w-4 mr-2 shrink-0" />
                          <span className="truncate">{job.company}</span>
                        </div>
                      )}

                      {job.location && (
                        <div className={`flex items-center text-sm mb-2 ${theme.textMuted}`}>
                          <MapPin className="h-4 w-4 mr-2 shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </div>
                      )}

                      {job.reward && (
                        <div className={cn(
                          "flex items-center text-sm font-medium mb-3",
                          darkMode ? "text-violet-400" : "text-primary"
                        )}>
                          <DollarSign className="h-4 w-4 mr-2 shrink-0" />
                          <span>{job.reward}</span>
                        </div>
                      )}

                      {job.description && (
                        <p className={`text-sm line-clamp-2 mb-3 ${theme.textSubtle}`}>
                          {job.description}
                        </p>
                      )}

                      <div className={cn(
                        "flex items-center justify-between pt-3 border-t",
                        theme.divider
                      )}>
                        <span className={`text-xs ${theme.textSubtle}`}>자세히 보기</span>
                        <ChevronRight className={cn(
                          "h-4 w-4",
                          darkMode ? "text-violet-400" : "text-primary"
                        )} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 페이징 컨트롤 */}
                {totalPages > 1 && (
                  <div className={cn(
                    "mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6",
                    theme.divider
                  )}>
                    <div className={`text-sm ${theme.textMuted}`}>
                      {startIndex + 1} - {Math.min(endIndex, currentData.jobListings.length)} / 총 {currentData.jobListings.length}개
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPages({ ...currentPages, [activeTab]: currentPage - 1 })}
                        disabled={currentPage === 1}
                        className={cn(
                          "px-3",
                          darkMode && "border-white/[0.1] text-white/70 hover:bg-white/[0.05]"
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPages({ ...currentPages, [activeTab]: pageNum })}
                              className={cn(
                                "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                currentPage === pageNum
                                  ? darkMode
                                    ? "bg-gradient-to-r from-violet-600 to-violet-500 text-white"
                                    : "bg-gradient-to-r from-primary to-violet-600 text-white"
                                  : darkMode
                                    ? "text-white/70 hover:bg-white/[0.05]"
                                    : "text-gray-700 hover:bg-gray-100"
                              )}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPages({ ...currentPages, [activeTab]: currentPage + 1 })}
                        disabled={currentPage === totalPages}
                        className={cn(
                          "px-3",
                          darkMode && "border-white/[0.1] text-white/70 hover:bg-white/[0.05]"
                        )}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Inbox className={cn(
                  "h-16 w-16 mx-auto mb-4",
                  darkMode ? "text-white/20" : "text-gray-300"
                )} />
                <p className={theme.textMuted}>검색 결과가 없습니다.</p>
              </div>
            )}
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && results.length === 0 && !error && (
          <Card className={cn(
            "p-8 sm:p-12 text-center border shadow-lg",
            darkMode ? "bg-white/[0.02] border-white/[0.08]" : "bg-white border-gray-200"
          )}>
            <Search className={cn(
              "h-16 w-16 mx-auto mb-4",
              darkMode ? "text-white/20" : "text-gray-300"
            )} />
            <p className={`text-lg mb-2 ${theme.textMuted}`}>채용 정보를 검색해보세요</p>
            <p className={`text-sm ${theme.textSubtle}`}>추천된 직업을 클릭하거나 검색 키워드를 입력하세요</p>
          </Card>
        )}
        </main>
      </div>
    </div>
  );
}