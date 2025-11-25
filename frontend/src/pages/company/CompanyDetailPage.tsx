import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const CompanyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCompanyDetail();
    }
  }, [id]);

  const fetchCompanyDetail = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8000/api/company/${id}`);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">기업 정보를 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate('/company-list')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 뒤로 가기 버튼 */}
        <button
          onClick={() => navigate('/company-list')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          목록으로 돌아가기
        </button>

        {/* 기업 정보 카드 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-2">
                  <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-white/20">
                    {getSiteLabel(company.site_name)}
                  </span>
                </div>
                <h1 className="text-3xl font-bold mb-2">{company.company_name}</h1>
                {company.industry && (
                  <p className="text-blue-100">{company.industry}</p>
                )}
              </div>
              {company.logo_url && (
                <img
                  src={company.logo_url}
                  alt={company.company_name}
                  className="w-20 h-20 rounded-lg bg-white"
                />
              )}
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="p-8 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">기본 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {company.company_type && (
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">기업구분</p>
                    <p className="text-gray-900">{company.company_type}</p>
                  </div>
                </div>
              )}

              {company.location && (
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5 mr-3"
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
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">위치</p>
                    <p className="text-gray-900">{company.location}</p>
                  </div>
                </div>
              )}

              {company.established_year && (
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">설립일</p>
                    <p className="text-gray-900">{company.established_year}</p>
                  </div>
                </div>
              )}

              {company.employee_count && (
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">사원수</p>
                    <p className="text-gray-900">{company.employee_count}</p>
                  </div>
                </div>
              )}

              {company.ceo_name && (
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">대표자</p>
                    <p className="text-gray-900">{company.ceo_name}</p>
                  </div>
                </div>
              )}

              {company.capital && (
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">자본금</p>
                    <p className="text-gray-900">{company.capital}</p>
                  </div>
                </div>
              )}

              {company.revenue && (
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">매출액</p>
                    <p className="text-gray-900">{company.revenue}</p>
                  </div>
                </div>
              )}

              {company.average_salary && (
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">대졸초임</p>
                    <p className="text-gray-900">{company.average_salary}</p>
                  </div>
                </div>
              )}

              {company.address && (
                <div className="flex items-start md:col-span-2">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">주소</p>
                    <p className="text-gray-900">{company.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 회사 소개 */}
          {company.description && (
            <div className="p-8 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">회사 소개</h2>
              <p className="text-gray-700 whitespace-pre-line">{company.description}</p>
            </div>
          )}

          {/* 비전 */}
          {company.vision && (
            <div className="p-8 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">비전 / 미션</h2>
              <p className="text-gray-700 whitespace-pre-line">{company.vision}</p>
            </div>
          )}

          {/* 복지 */}
          {company.benefits && (
            <div className="p-8 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">복지 / 혜택</h2>
              <p className="text-gray-700 whitespace-pre-line">{company.benefits}</p>
            </div>
          )}

          {/* 기업문화 */}
          {company.culture && (
            <div className="p-8 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">기업 문화</h2>
              <p className="text-gray-700 whitespace-pre-line">{company.culture}</p>
            </div>
          )}

          {/* 링크 */}
          <div className="p-8 bg-gray-50">
            <div className="flex flex-wrap gap-3">
              {company.homepage_url && (
                <a
                  href={company.homepage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  홈페이지 방문
                </a>
              )}

              {company.recruitment_url && (
                <a
                  href={company.recruitment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  채용 공고 보기
                </a>
              )}
            </div>

            <div className="mt-4 text-xs text-gray-500">
              최종 업데이트: {new Date(company.updated_at).toLocaleDateString('ko-KR')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailPage;
