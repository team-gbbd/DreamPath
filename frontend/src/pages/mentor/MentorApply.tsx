import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mentorService } from '@/lib/api';

export default function MentorApplyPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [company, setCompany] = useState('');
  const [job, setJob] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [bio, setBio] = useState('');
  const [career, setCareer] = useState('');

  const getLoggedInUserId = (): number | null => {
    try {
      const userStr = localStorage.getItem('dreampath:user');
      if (!userStr) return null;
      const user = JSON.parse(userStr);
      return user.userId || null;
    } catch {
      return null;
    }
  };

  const userId = getLoggedInUserId();

  useEffect(() => {
    if (!userId) {
      alert('로그인이 필요합니다.');
      navigate('/login');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!company || !job || !yearsOfExperience) {
      alert('회사 정보를 모두 입력해주세요.');
      return;
    }

    const years = parseInt(yearsOfExperience);
    if (isNaN(years) || years < 1 || years > 50) {
      alert('경력은 1년 이상 50년 이하로 입력해주세요.');
      return;
    }

    if (bio.length < 50) {
      alert('자기소개는 최소 50자 이상 작성해주세요.');
      return;
    }

    if (career.length < 20) {
      alert('경력 사항은 최소 20자 이상 작성해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await mentorService.applyForMentor({
        userId,
        company,
        job,
        experience: `${yearsOfExperience}년`,
        bio,
        career,
        availableTime: {},
      });

      alert('멘토 신청이 완료되었습니다! 관리자 승인 후 멘토 활동을 시작하실 수 있습니다.');
      navigate('/profile/dashboard');
    } catch (err: any) {
      console.error('멘토 신청 실패:', err);
      if (err.response?.status === 400 && err.response?.data?.includes('이미 신청')) {
        setError('이미 멘토 신청을 하셨습니다. 마이페이지에서 신청 현황을 확인해주세요.');
      } else {
        setError(err.response?.data || '멘토 신청 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      

      <div className="pt-16 min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate('/profile/dashboard')}
            className="mb-6 text-gray-600 hover:text-gray-800 transition-colors flex items-center"
          >
            <i className="ri-arrow-left-line text-xl mr-1"></i>
            <span className="text-sm">대시보드로</span>
          </button>

          {/* Main Container */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-pink-300 p-8">
            {/* Title Section */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-user-star-line text-pink-500 text-3xl"></i>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">멘토 지원하기</h1>
              <p className="text-gray-600">가치 있는 커리어 경험을 공유해 보세요.</p>
            </div>
            {error && (
              <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start">
                <i className="ri-error-warning-line text-red-500 text-xl mr-3 mt-0.5"></i>
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Info Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <i className="ri-building-line text-2xl text-pink-500 mr-2"></i>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">회사 정보</h2>
                    <p className="text-sm text-gray-600">현재 재직 중인 회사와 직업을 입력해주세요</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* 회사명 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      회사명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none transition-colors"
                      placeholder="예) 카카오"
                      required
                    />
                  </div>

                  {/* 직업 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      직업 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={job}
                      onChange={(e) => setJob(e.target.value)}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none transition-colors"
                      placeholder="예) 백엔드 개발자"
                      required
                    />
                  </div>

                  {/* 경력 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      경력 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={yearsOfExperience}
                        onChange={(e) => setYearsOfExperience(e.target.value)}
                        className="flex-1 p-3 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none transition-colors"
                        placeholder="예) 3"
                        min="1"
                        max="50"
                        required
                      />
                      <span className="text-gray-700 font-medium">년</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <i className="ri-quill-pen-line text-2xl text-pink-500 mr-2"></i>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">자기소개</h2>
                    <p className="text-sm text-gray-600">전문 분야와 멘토링 철학을 소개해주세요 (최소 50자)</p>
                  </div>
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full h-40 p-4 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none resize-none transition-colors"
                  placeholder="예시) 저는 10년 경력의 백엔드 개발자로, Spring Boot와 MSA 아키텍처에 전문성을 갖추고 있습니다. 실무 경험을 바탕으로 후배 개발자들이 올바른 방향으로 성장할 수 있도록 돕고 싶습니다."
                  required
                />
                <div className="flex justify-between items-center mt-2">
                  <p className={`text-sm ${bio.length >= 50 ? 'text-green-600' : 'text-gray-500'}`}>
                    {bio.length} / 50자 이상
                  </p>
                  {bio.length >= 50 && (
                    <i className="ri-checkbox-circle-fill text-green-500 text-xl"></i>
                  )}
                </div>
              </div>

              {/* Career Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <i className="ri-briefcase-line text-2xl text-pink-500 mr-2"></i>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">경력 사항</h2>
                    <p className="text-sm text-gray-600">주요 경력과 프로젝트 경험을 작성해주세요 (최소 20자)</p>
                  </div>
                </div>
                <textarea
                  value={career}
                  onChange={(e) => setCareer(e.target.value)}
                  className="w-full h-40 p-4 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none resize-none transition-colors"
                  placeholder="예시) • 삼성전자 SW 센터 (2015-2020): 대규모 분산 시스템 설계 및 개발&#10;• 네이버 검색 개발팀 (2020-현재): 검색 엔진 최적화 및 성능 개선&#10;• 주요 기술: Java, Spring Boot, Kubernetes, Redis, Kafka"
                  required
                />
                <div className="flex justify-between items-center mt-2">
                  <p className={`text-sm ${career.length >= 20 ? 'text-green-600' : 'text-gray-500'}`}>
                    {career.length} / 20자 이상
                  </p>
                  {career.length >= 20 && (
                    <i className="ri-checkbox-circle-fill text-green-500 text-xl"></i>
                  )}
                </div>
              </div>

              {/* Info Notice */}
              <div className="bg-blue-50 rounded-lg p-5 border-2 border-blue-200">
                <div className="flex items-start">
                  <i className="ri-information-line text-2xl text-blue-500 mr-3 mt-0.5"></i>
                  <div>
                    <h3 className="font-bold text-gray-800 mb-1">멘토링 일정 등록 안내</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      멘토 신청이 승인되면, <span className="font-bold text-pink-600">/mentoring 페이지</span>에서
                      멘토링 가능 시간을 등록하실 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/profile/dashboard')}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !company || !job || !yearsOfExperience || bio.length < 50 || career.length < 20}
                  className="flex-1 bg-pink-500 text-white py-4 rounded-lg font-bold hover:bg-pink-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                      신청 중...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <i className="ri-send-plane-fill mr-2"></i>
                      멘토 신청하기
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
