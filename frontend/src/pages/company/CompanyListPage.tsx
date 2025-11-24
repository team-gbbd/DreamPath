import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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

const CompanyListPage = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchCompanies();
  }, [page, siteFilter, searchKeyword]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      let url = `http://localhost:8000/api/company/list?page=${page}&page_size=${pageSize}`;

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
        `http://localhost:8000/api/company/search/by-name?name=${searchInput}&page=${page}&page_size=${pageSize}`
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

  const handleCrawl = async () => {
    setCrawling(true);
    try {
      let response;

      if (crawlSite === 'wanted') {
        response = await axios.post('http://localhost:8000/api/job-sites/crawl/wanted', {
          searchKeyword: crawlKeyword,
          maxResults: crawlMaxResults,
          forceRefresh: true
        }, { timeout: 120000 });
      } else if (crawlSite === 'jobkorea') {
        response = await axios.post('http://localhost:8000/api/job-sites/crawl', {
          siteName: 'jobkorea',
          siteUrl: `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(crawlKeyword)}&menucode=local`,
          searchKeyword: crawlKeyword,
          maxResults: crawlMaxResults,
          forceRefresh: true
        }, { timeout: 120000 });
      } else if (crawlSite === 'saramin') {
        response = await axios.post('http://localhost:8000/api/job-sites/crawl', {
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
        fetchCompanies(); // 목록 새로고침
      }
    } catch (error: any) {
      alert('크롤링 실패: ' + (error.response?.data?.detail || error.message));
    } finally {
      setCrawling(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">기업 정보</h1>
            <p className="text-gray-600">다양한 기업의 정보를 확인하세요</p>
          </div>
          <button
            onClick={() => setShowCrawlModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            기업정보 크롤링
          </button>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 사이트 필터 */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                채용 사이트
              </label>
              <select
                value={siteFilter}
                onChange={(e) => {
                  setSiteFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">전체</option>
                <option value="wanted">원티드</option>
                <option value="jobkorea">잡코리아</option>
                <option value="saramin">사람인</option>
              </select>
            </div>

            {/* 검색 */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                회사명 검색
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="회사명을 입력하세요"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  검색
                </button>
              </div>
            </div>
          </div>

          {/* 검색 결과 정보 */}
          <div className="mt-4 text-sm text-gray-600">
            총 <span className="font-semibold text-gray-900">{total}</span>개의 기업
            {searchKeyword && (
              <>
                {' '}
                - 검색어: <span className="font-semibold text-blue-600">{searchKeyword}</span>
                <button
                  onClick={() => {
                    setSearchKeyword('');
                    setSearchInput('');
                    setPage(1);
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  (초기화)
                </button>
              </>
            )}
          </div>
        </div>

        {/* 기업 목록 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">등록된 기업이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleCompanyClick(company.id)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-6"
              >
                {/* 사이트 배지 */}
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {getSiteLabel(company.site_name)}
                  </span>
                </div>

                {/* 회사명 */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {company.company_name}
                </h3>

                {/* 위치 */}
                {company.location && (
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {company.location}
                  </div>
                )}

                {/* 설명 */}
                {company.description && (
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {company.description}
                  </p>
                )}

                {/* 추가 정보 */}
                <div className="text-xs text-gray-500 space-y-1">
                  {company.industry && <div>업종: {company.industry}</div>}
                  {company.employee_count && <div>직원수: {company.employee_count}</div>}
                  {company.established_year && <div>설립: {company.established_year}</div>}
                </div>

                {/* 링크 버튼 */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                  {company.homepage_url && (
                    <a
                      href={company.homepage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      홈페이지
                    </a>
                  )}
                  {company.recruitment_url && (
                    <a
                      href={company.recruitment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      채용공고
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
                    className={`px-4 py-2 rounded-lg ${
                      page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
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
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              다음
            </button>
          </div>
        )}

        {/* 크롤링 모달 */}
        {showCrawlModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">기업정보 크롤링</h2>

              <div className="space-y-4">
                {/* 사이트 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">사이트 선택</label>
                  <div className="flex gap-2">
                    {['wanted', 'jobkorea', 'saramin'].map((site) => (
                      <button
                        key={site}
                        onClick={() => setCrawlSite(site)}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                          crawlSite === site
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {getSiteLabel(site)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 검색 키워드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">검색 키워드</label>
                  <input
                    type="text"
                    value={crawlKeyword}
                    onChange={(e) => setCrawlKeyword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 개발자, 백엔드"
                  />
                </div>

                {/* 최대 결과 수 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">최대 결과 수</label>
                  <input
                    type="number"
                    value={crawlMaxResults}
                    onChange={(e) => setCrawlMaxResults(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="100"
                  />
                </div>

                {/* 버튼 */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCrawlModal(false)}
                    disabled={crawling}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCrawl}
                    disabled={crawling}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {crawling ? '크롤링 중...' : '시작'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyListPage;
