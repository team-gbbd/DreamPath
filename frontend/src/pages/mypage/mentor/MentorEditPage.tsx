import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mentorService } from '@/lib/api';

interface Mentor {
  mentorId: number;
  userId: number;
  company: string;
  job: string;
  experience: string;
  bio: string;
  career: string;
  availableTime: Record<string, string[]>;
  status: string;
  createdAt: string;
}

export default function MentorEditPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentorId, setMentorId] = useState<number | null>(null);

  const [company, setCompany] = useState('');
  const [job, setJob] = useState('');
  const [experience, setExperience] = useState('');
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
      return;
    }

    fetchMentor();
  }, [userId]);

  const fetchMentor = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      // 로그인한 사용자의 멘토 정보를 가져옴
      const data: Mentor = await mentorService.getMyApplication(userId);

      if (data.status !== 'APPROVED') {
        alert('승인된 멘토만 프로필을 수정할 수 있습니다.');
        navigate('/mypage');
        return;
      }

      setMentorId(data.mentorId);
      setCompany(data.company || '');
      setJob(data.job || '');
      setExperience(data.experience || '');
      setBio(data.bio || '');
      setCareer(data.career || '');
    } catch (err: any) {
      console.error('멘토 정보 로딩 실패:', err);
      if (err.response?.status === 404) {
        alert('멘토 정보를 찾을 수 없습니다.');
        navigate('/mypage');
        return;
      }
      setError(err.response?.data || '멘토 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mentorId) return;

    if (!company.trim()) {
      alert('회사명을 입력해주세요.');
      return;
    }

    if (!job.trim()) {
      alert('직업을 입력해주세요.');
      return;
    }

    if (!experience.trim()) {
      alert('경력을 입력해주세요.');
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
      setIsSaving(true);
      setError(null);

      await mentorService.updateMentorProfile(mentorId, {
        company,
        job,
        experience,
        bio,
        career,
      });

      alert('프로필이 수정되었습니다!');
      navigate('/mypage');
    } catch (err: any) {
      console.error('프로필 수정 실패:', err);
      setError(err.response?.data || '프로필 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <i className="ri-edit-line text-pink-500 text-xl"></i>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">멘토 프로필 수정</h1>
                <p className="text-sm text-gray-500">프로필 정보를 업데이트하세요</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/mypage')}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <i className="ri-close-line text-2xl"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <i className="ri-error-warning-line text-red-500 text-xl mr-3 mt-0.5"></i>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 기본 정보 Section */}
          <div className="border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <i className="ri-user-line text-2xl text-pink-500 mr-3"></i>
              <div>
                <h2 className="text-lg font-bold text-gray-800">기본 정보</h2>
                <p className="text-sm text-gray-500">현재 소속과 경력을 입력해주세요</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">회사명</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-pink-400 focus:outline-none transition-colors"
                  placeholder="예: 카카오"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직업</label>
                <input
                  type="text"
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-pink-400 focus:outline-none transition-colors"
                  placeholder="예: 백엔드 개발자"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">경력</label>
                <input
                  type="text"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-pink-400 focus:outline-none transition-colors"
                  placeholder="예: 3년"
                  required
                />
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className="border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <i className="ri-quill-pen-line text-2xl text-pink-500 mr-3"></i>
              <div>
                <h2 className="text-lg font-bold text-gray-800">자기소개</h2>
                <p className="text-sm text-gray-500">전문 분야와 멘토링 철학을 소개해주세요 (최소 50자)</p>
              </div>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full h-36 p-4 border border-gray-200 rounded-lg focus:border-pink-400 focus:outline-none resize-none transition-colors"
              placeholder="예시) 저는 10년 경력의 백엔드 개발자로, Spring Boot와 MSA 아키텍처에 전문성을 갖추고 있습니다. 실무 경험을 바탕으로 후배 개발자들이 올바른 방향으로 성장할 수 있도록 돕고 싶습니다."
              required
            />
            <div className="flex justify-between items-center mt-2">
              <p className={`text-sm ${bio.length >= 50 ? 'text-green-600' : 'text-gray-500'}`}>
                {bio.length} / 50자 이상
              </p>
              {bio.length >= 50 && (
                <i className="ri-checkbox-circle-fill text-green-500 text-lg"></i>
              )}
            </div>
          </div>

          {/* Career Section */}
          <div className="border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <i className="ri-briefcase-line text-2xl text-pink-500 mr-3"></i>
              <div>
                <h2 className="text-lg font-bold text-gray-800">경력 사항</h2>
                <p className="text-sm text-gray-500">주요 경력과 프로젝트 경험을 작성해주세요 (최소 20자)</p>
              </div>
            </div>
            <textarea
              value={career}
              onChange={(e) => setCareer(e.target.value)}
              className="w-full h-36 p-4 border border-gray-200 rounded-lg focus:border-pink-400 focus:outline-none resize-none transition-colors"
              placeholder="예시) • 삼성전자 SW 센터 (2015-2020): 대규모 분산 시스템 설계 및 개발&#10;• 네이버 검색 개발팀 (2020-현재): 검색 엔진 최적화 및 성능 개선&#10;• 주요 기술: Java, Spring Boot, Kubernetes, Redis, Kafka"
              required
            />
            <div className="flex justify-between items-center mt-2">
              <p className={`text-sm ${career.length >= 20 ? 'text-green-600' : 'text-gray-500'}`}>
                {career.length} / 20자 이상
              </p>
              {career.length >= 20 && (
                <i className="ri-checkbox-circle-fill text-green-500 text-lg"></i>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/mypage')}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving || !company.trim() || !job.trim() || !experience.trim() || bio.length < 50 || career.length < 20}
              className="flex-1 bg-pink-500 text-white py-3 rounded-lg font-medium hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <span className="flex items-center justify-center">
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  저장 중...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <i className="ri-save-line mr-2"></i>
                  수정 완료
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
