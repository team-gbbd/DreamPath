import { useState } from 'react';
import axios from 'axios';

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
  const [loading, setLoading] = useState(false);
  const [selectedSite, setSelectedSite] = useState('wanted');
  const [searchKeyword, setSearchKeyword] = useState('개발자');
  const [maxResults, setMaxResults] = useState(20);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [error, setError] = useState('');

  const handleCrawl = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let response;

      if (selectedSite === 'wanted') {
        response = await axios.post('http://localhost:8000/api/job-sites/crawl/wanted', {
          searchKeyword,
          maxResults,
          forceRefresh: true
        }, {
          timeout: 120000
        });
      } else if (selectedSite === 'jobkorea') {
        response = await axios.post('http://localhost:8000/api/job-sites/crawl', {
          siteName: 'jobkorea',
          siteUrl: `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(searchKeyword)}&menucode=local`,
          searchKeyword,
          maxResults,
          forceRefresh: true
        }, {
          timeout: 120000
        });
      } else if (selectedSite === 'saramin') {
        response = await axios.post('http://localhost:8000/api/job-sites/crawl', {
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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">채용정보 크롤러</h1>
          <p className="text-gray-600">채용 사이트에서 공고와 기업 정보를 수집합니다</p>
        </div>

        {/* 크롤링 설정 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">크롤링 설정</h2>

          <div className="space-y-4">
            {/* 사이트 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                채용 사이트
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedSite('wanted')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedSite === 'wanted'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  원티드
                </button>
                <button
                  onClick={() => setSelectedSite('jobkorea')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedSite === 'jobkorea'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  잡코리아
                </button>
                <button
                  onClick={() => setSelectedSite('saramin')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedSite === 'saramin'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  사람인
                </button>
              </div>
            </div>

            {/* 검색 키워드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색 키워드
              </label>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: 개발자, 백엔드, 프론트엔드"
              />
            </div>

            {/* 최대 결과 수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                최대 결과 수
              </label>
              <input
                type="number"
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="100"
              />
            </div>

            {/* 크롤링 버튼 */}
            <button
              onClick={handleCrawl}
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? '크롤링 중...' : '크롤링 시작'}
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-600 mt-0.5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">크롤링 실패</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">크롤링 결과</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium">채용공고</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">
                  {result.jobListings?.length || 0}개
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600 font-medium">DB 저장</div>
                <div className="text-2xl font-bold text-green-900 mt-1">
                  {result.savedToDatabase || 0}개
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600 font-medium">기업정보</div>
                <div className="text-2xl font-bold text-purple-900 mt-1">
                  {result.savedCompanies || 0}개
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 font-medium">캐시</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {result.fromCache ? '사용' : '신규'}
                </div>
              </div>
            </div>

            {/* 공고 목록 미리보기 */}
            {result.jobListings && result.jobListings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  채용공고 미리보기 (최근 5개)
                </h3>
                <div className="space-y-3">
                  {result.jobListings.slice(0, 5).map((job, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <h4 className="font-medium text-gray-900">{job.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{job.company}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {job.location && <span>📍 {job.location}</span>}
                        {job.experience && <span>💼 {job.experience}</span>}
                        {job.salary && <span>💰 {job.salary}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 전체 보기 링크 */}
                <div className="mt-4 text-center">
                  <a
                    href="/job-listings"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                  >
                    전체 채용공고 보기
                    <svg
                      className="w-4 h-4 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            )}

            {/* 기업정보 보기 링크 */}
            {result.savedCompanies && result.savedCompanies > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <a
                  href="/company-list"
                  className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium"
                >
                  수집된 기업정보 보기 ({result.savedCompanies}개)
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CrawlerPage;
