import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jobSiteService } from '@/lib/api';
import type { JobListing, CrawlResponse, CareerRecommendation } from '@/types';

export default function JobListingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [results, setResults] = useState<CrawlResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [maxResults, setMaxResults] = useState(0); // 0 = 모든 결과 가져오기
  const [currentPages, setCurrentPages] = useState<{ [key: string]: number }>({}); // 탭별 현재 페이지
  const [activeTab, setActiveTab] = useState<'all' | 'wanted' | 'saramin' | 'jobkorea'>('all'); // 활성 탭
  const itemsPerPage = 10; // 페이지당 표시할 항목 수

  // URL에서 추천된 직업 정보 가져오기
  const careerRecommendations = location.state?.careerRecommendations as CareerRecommendation[] | undefined;

  useEffect(() => {
    // 추천된 직업이 있으면 자동으로 검색
    if (careerRecommendations && careerRecommendations.length > 0) {
      const firstCareer = careerRecommendations[0];
      setSearchKeyword(firstCareer.careerName);
      handleSearch(firstCareer.careerName);
    }
  }, [careerRecommendations]);

  const handleSearch = async (keyword?: string) => {
    const searchTerm = keyword || searchKeyword;
    if (!searchTerm.trim()) {
      setError('검색 키워드를 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 원티드, 사람인, 잡코리아 동시 크롤링
      const [wantedResult, saraminResult, jobkoreaResult] = await Promise.all([
        jobSiteService.crawlWanted(searchTerm, maxResults, false),
        jobSiteService.crawlJobSite('사람인', 'https://www.saramin.co.kr', searchTerm, maxResults, false),
        jobSiteService.crawlJobSite('잡코리아', 'https://www.jobkorea.co.kr', searchTerm, maxResults, false)
      ]);
      
      const allResults: CrawlResponse[] = [];
      if (wantedResult.success) {
        allResults.push(wantedResult);
      }
      if (saraminResult.success) {
        allResults.push(saraminResult);
      }
      if (jobkoreaResult.success) {
        allResults.push(jobkoreaResult);
      }
      
      if (allResults.length > 0) {
        setResults(allResults);
        setFromCache(wantedResult.fromCache || saraminResult.fromCache || jobkoreaResult.fromCache || false);
        // 탭별로 첫 페이지로 리셋
        setCurrentPages({ all: 1, wanted: 1, saramin: 1, jobkorea: 1 });
      } else {
        setError('채용 정보를 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      console.error('크롤링 실패:', err);
      setError(err.message || '채용 정보를 가져오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!searchKeyword.trim()) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // 원티드, 사람인, 잡코리아 강제 새로고침
      const [wantedResult, saraminResult, jobkoreaResult] = await Promise.all([
        jobSiteService.crawlWanted(searchKeyword, maxResults, true),
        jobSiteService.crawlJobSite('사람인', 'https://www.saramin.co.kr', searchKeyword, maxResults, true),
        jobSiteService.crawlJobSite('잡코리아', 'https://www.jobkorea.co.kr', searchKeyword, maxResults, true)
      ]);
      
      const allResults: CrawlResponse[] = [];
      if (wantedResult.success) {
        allResults.push(wantedResult);
      }
      if (saraminResult.success) {
        allResults.push(saraminResult);
      }
      if (jobkoreaResult.success) {
        allResults.push(jobkoreaResult);
      }
      
      if (allResults.length > 0) {
        setResults(allResults);
        setFromCache(false);
        // 탭별로 첫 페이지로 리셋
        setCurrentPages({ all: 1, wanted: 1, saramin: 1, jobkorea: 1 });
      } else {
        setError('채용 정보를 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      console.error('크롤링 실패:', err);
      setError(err.message || '채용 정보를 가져오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrawl = async () => {
    const keyword = searchKeyword.trim() || '개발자'; // 기본값 설정
    
    try {
      setIsLoading(true);
      setError(null);
      setResults([]);

      // 원티드, 사람인, 잡코리아 크롤링 시작 (강제 새로고침)
      const [wantedResult, saraminResult, jobkoreaResult] = await Promise.all([
        jobSiteService.crawlWanted(keyword, maxResults, true),
        jobSiteService.crawlJobSite('사람인', 'https://www.saramin.co.kr', keyword, maxResults, true),
        jobSiteService.crawlJobSite('잡코리아', 'https://www.jobkorea.co.kr', keyword, maxResults, true)
      ]);
      
      const allResults: CrawlResponse[] = [];
      if (wantedResult.success) {
        allResults.push(wantedResult);
      }
      if (saraminResult.success) {
        allResults.push(saraminResult);
      }
      if (jobkoreaResult.success) {
        allResults.push(jobkoreaResult);
      }
      
      if (allResults.length > 0) {
        setResults(allResults);
        setFromCache(false);
        setSearchKeyword(keyword);
        // 탭별로 첫 페이지로 리셋
        setCurrentPages({ all: 1, wanted: 1, saramin: 1, jobkorea: 1 });
      } else {
        setError('크롤링에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('크롤링 실패:', err);
      setError(err.message || '크롤링에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <i className="ri-arrow-left-line text-2xl"></i>
              </button>
              <div className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg flex items-center justify-center">
                <i className="ri-briefcase-line text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">채용 정보</h1>
                <p className="text-sm text-gray-600">추천된 직업에 맞는 채용 공고를 확인하세요</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색 키워드
              </label>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="예: 개발자, 디자이너, 마케터..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#5A7BFF] focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => handleSearch()}
                disabled={isLoading}
                className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    검색 중...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <i className="ri-search-line mr-2"></i>
                    검색
                  </span>
                )}
              </button>
              <button
                onClick={handleCrawl}
                disabled={isLoading}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="크롤링 시작 (모든 채용 공고 수집)"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    크롤링 중...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <i className="ri-download-cloud-line mr-2"></i>
                    크롤링 시작
                  </span>
                )}
              </button>
              {results.length > 0 && (
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="bg-white text-gray-700 border-2 border-gray-300 px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="캐시를 무시하고 새로고침"
                >
                  <i className="ri-refresh-line"></i>
                </button>
              )}
            </div>
          </div>

          {/* 추천된 직업 표시 */}
          {careerRecommendations && careerRecommendations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">추천된 직업:</p>
              <div className="flex flex-wrap gap-2">
                {careerRecommendations.map((career, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchKeyword(career.careerName);
                      handleSearch(career.careerName);
                    }}
                    className="bg-gradient-to-r from-[#5A7BFF]/10 to-[#8F5CFF]/10 text-[#5A7BFF] px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                  >
                    {career.careerName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 캐시 정보 */}
          {fromCache && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center text-sm text-gray-600">
                <i className="ri-information-line mr-2 text-blue-500"></i>
                <span>캐시된 데이터를 표시하고 있습니다. 최신 정보를 보려면 새로고침 버튼을 클릭하세요.</span>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <i className="ri-error-warning-line text-red-500 text-xl mr-3"></i>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (() => {
          // 탭별 데이터 준비
          const wantedResult = results.find(r => r.site === '원티드');
          const saraminResult = results.find(r => r.site === '사람인');
          const jobkoreaResult = results.find(r => r.site === '잡코리아');
          
          // 종합보기: 모든 채용 공고 합치기
          const allJobListings: JobListing[] = [];
          if (wantedResult?.jobListings) {
            allJobListings.push(...wantedResult.jobListings);
          }
          if (saraminResult?.jobListings) {
            allJobListings.push(...saraminResult.jobListings);
          }
          if (jobkoreaResult?.jobListings) {
            allJobListings.push(...jobkoreaResult.jobListings);
          }
          
          // 현재 탭에 맞는 데이터 선택
          const currentData = activeTab === 'all' 
            ? { 
                jobListings: allJobListings, 
                totalResults: allJobListings.length, 
                site: '종합보기',
                searchUrl: undefined
              }
            : activeTab === 'wanted'
            ? { 
                jobListings: wantedResult?.jobListings || [], 
                totalResults: wantedResult?.totalResults || 0, 
                site: '원티드', 
                searchUrl: wantedResult?.searchUrl 
              }
            : activeTab === 'saramin'
            ? { 
                jobListings: saraminResult?.jobListings || [], 
                totalResults: saraminResult?.totalResults || 0, 
                site: '사람인', 
                searchUrl: saraminResult?.searchUrl 
              }
            : { 
                jobListings: jobkoreaResult?.jobListings || [], 
                totalResults: jobkoreaResult?.totalResults || 0, 
                site: '잡코리아', 
                searchUrl: jobkoreaResult?.searchUrl 
              };
          
          const currentPage = currentPages[activeTab] || 1;
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          const paginatedJobs = currentData.jobListings.slice(startIndex, endIndex);
          const totalPages = Math.ceil(currentData.jobListings.length / itemsPerPage);
          
          return (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              {/* 탭 메뉴 */}
              <div className="flex items-center gap-2 mb-6 border-b border-gray-200">
                <button
                  onClick={() => {
                    setActiveTab('all');
                    setCurrentPages({ ...currentPages, all: 1 });
                  }}
                  className={`px-6 py-3 font-medium transition-colors relative ${
                    activeTab === 'all'
                      ? 'text-[#5A7BFF]'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  종합보기
                  {allJobListings.length > 0 && (
                    <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      {allJobListings.length}
                    </span>
                  )}
                  {activeTab === 'all' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF]"></div>
                  )}
                </button>
                {wantedResult && (
                  <button
                    onClick={() => {
                      setActiveTab('wanted');
                      setCurrentPages({ ...currentPages, wanted: 1 });
                    }}
                    className={`px-6 py-3 font-medium transition-colors relative ${
                      activeTab === 'wanted'
                        ? 'text-[#5A7BFF]'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    원티드
                    {wantedResult.totalResults > 0 && (
                      <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                        {wantedResult.totalResults}
                      </span>
                    )}
                    {activeTab === 'wanted' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF]"></div>
                    )}
                  </button>
                )}
                {saraminResult && (
                  <button
                    onClick={() => {
                      setActiveTab('saramin');
                      setCurrentPages({ ...currentPages, saramin: 1 });
                    }}
                    className={`px-6 py-3 font-medium transition-colors relative ${
                      activeTab === 'saramin'
                        ? 'text-[#5A7BFF]'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    사람인
                    {saraminResult.totalResults > 0 && (
                      <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                        {saraminResult.totalResults}
                      </span>
                    )}
                    {activeTab === 'saramin' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF]"></div>
                    )}
                  </button>
                )}
                {jobkoreaResult && (
                  <button
                    onClick={() => {
                      setActiveTab('jobkorea');
                      setCurrentPages({ ...currentPages, jobkorea: 1 });
                    }}
                    className={`px-6 py-3 font-medium transition-colors relative ${
                      activeTab === 'jobkorea'
                        ? 'text-[#5A7BFF]'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    잡코리아
                    {jobkoreaResult.totalResults > 0 && (
                      <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                        {jobkoreaResult.totalResults}
                      </span>
                    )}
                    {activeTab === 'jobkorea' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF]"></div>
                    )}
                  </button>
                )}
              </div>

              {/* Site Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg flex items-center justify-center">
                    <i className="ri-briefcase-line text-white text-xl"></i>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{currentData.site}</h2>
                    <p className="text-sm text-gray-600">
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
                    className="text-[#5A7BFF] hover:text-[#8F5CFF] transition-colors"
                  >
                    <i className="ri-external-link-line text-xl"></i>
                  </a>
                )}
              </div>

              {/* Job Listings */}
              {currentData.jobListings && currentData.jobListings.length > 0 ? (
                <>
                  {/* 페이징된 채용 공고 목록 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paginatedJobs.map((job, jobIdx) => (
                      <div
                        key={jobIdx}
                        className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => window.open(job.url, '_blank')}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-800 line-clamp-2 flex-1">
                            {job.title}
                          </h3>
                        </div>
                        
                        {job.company && (
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <i className="ri-building-line mr-2"></i>
                            <span>{job.company}</span>
                          </div>
                        )}
                        
                        {job.location && (
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <i className="ri-map-pin-line mr-2"></i>
                            <span>{job.location}</span>
                          </div>
                        )}
                        
                        {job.reward && (
                          <div className="flex items-center text-sm text-[#5A7BFF] font-medium mb-3">
                            <i className="ri-money-dollar-circle-line mr-2"></i>
                            <span>{job.reward}</span>
                          </div>
                        )}
                        
                        {job.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {job.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500">자세히 보기</span>
                          <i className="ri-arrow-right-line text-[#5A7BFF]"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 페이징 컨트롤 */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-6">
                      <div className="text-sm text-gray-600">
                        {startIndex + 1} - {Math.min(endIndex, currentData.jobListings.length)} / 총 {currentData.jobListings.length}개
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPages({ ...currentPages, [activeTab]: currentPage - 1 })}
                          disabled={currentPage === 1}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <i className="ri-arrow-left-s-line"></i>
                        </button>
                        
                        {/* 페이지 번호 */}
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
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  currentPage === pageNum
                                    ? 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => setCurrentPages({ ...currentPages, [activeTab]: currentPage + 1 })}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <i className="ri-arrow-right-s-line"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <i className="ri-inbox-line text-6xl text-gray-300 mb-4"></i>
                  <p className="text-gray-600">검색 결과가 없습니다.</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Empty State */}
        {!isLoading && results.length === 0 && !error && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <i className="ri-search-line text-6xl text-gray-300 mb-4"></i>
            <p className="text-gray-600 text-lg mb-2">채용 정보를 검색해보세요</p>
            <p className="text-gray-500 text-sm">추천된 직업을 클릭하거나 검색 키워드를 입력하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}

