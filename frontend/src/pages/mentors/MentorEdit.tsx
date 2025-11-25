import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mentorService } from '@/lib/api';

const DAYS_OF_WEEK = [
  { key: 'monday', label: '월요일' },
  { key: 'tuesday', label: '화요일' },
  { key: 'wednesday', label: '수요일' },
  { key: 'thursday', label: '목요일' },
  { key: 'friday', label: '금요일' },
  { key: 'saturday', label: '토요일' },
  { key: 'sunday', label: '일요일' },
];

const TIME_SLOTS = [
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '13:00-14:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00',
  '17:00-18:00',
  '18:00-19:00',
  '19:00-20:00',
  '20:00-21:00',
];

interface Mentor {
  mentorId: number;
  userId: number;
  bio: string;
  career: string;
  availableTime: Record<string, string[]>;
  status: string;
  createdAt: string;
}

export default function MentorEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bio, setBio] = useState('');
  const [career, setCareer] = useState('');
  const [availableTime, setAvailableTime] = useState<Record<string, string[]>>({});

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

    if (id) {
      fetchMentor();
    }
  }, [id]);

  const fetchMentor = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);

      const data: Mentor = await mentorService.getMentorDetail(parseInt(id));

      // 본인의 프로필인지 확인
      if (userId !== data.userId) {
        alert('본인의 프로필만 수정할 수 있습니다.');
        navigate(`/mentors/${id}`);
        return;
      }

      setBio(data.bio);
      setCareer(data.career);
      setAvailableTime(data.availableTime);
    } catch (err: any) {
      console.error('멘토 정보 로딩 실패:', err);
      setError(err.response?.data || '멘토 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeToggle = (day: string, timeSlot: string) => {
    setAvailableTime((prev) => {
      const dayTimes = prev[day] || [];
      const newDayTimes = dayTimes.includes(timeSlot)
        ? dayTimes.filter((t) => t !== timeSlot)
        : [...dayTimes, timeSlot];

      if (newDayTimes.length === 0) {
        const { [day]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [day]: newDayTimes.sort(),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    if (bio.length < 50) {
      alert('자기소개는 최소 50자 이상 작성해주세요.');
      return;
    }

    if (career.length < 20) {
      alert('경력 사항은 최소 20자 이상 작성해주세요.');
      return;
    }

    if (Object.keys(availableTime).length === 0) {
      alert('최소 1개 이상의 가능 시간을 선택해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await mentorService.updateMentorProfile(parseInt(id), {
        bio,
        career,
        availableTime,
      });

      alert('프로필이 수정되었습니다!');
      navigate(`/mentors/${id}`);
    } catch (err: any) {
      console.error('프로필 수정 실패:', err);
      setError(err.response?.data || '프로필 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5A7BFF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg flex items-center justify-center">
                <i className="ri-edit-line text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">멘토 프로필 수정</h1>
                <p className="text-sm text-gray-600">프로필 정보를 업데이트하세요</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/mentors/${id}`)}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <i className="ri-close-line text-2xl"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start">
            <i className="ri-error-warning-line text-red-500 text-xl mr-3 mt-0.5"></i>
            <div>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Bio Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center mb-6">
              <i className="ri-quill-pen-line text-3xl text-[#5A7BFF] mr-3"></i>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">자기소개</h2>
                <p className="text-sm text-gray-600">전문 분야와 멘토링 철학을 소개해주세요 (최소 50자)</p>
              </div>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl focus:border-[#5A7BFF] focus:outline-none resize-none transition-colors"
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
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center mb-6">
              <i className="ri-briefcase-line text-3xl text-[#5A7BFF] mr-3"></i>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">경력 사항</h2>
                <p className="text-sm text-gray-600">주요 경력과 프로젝트 경험을 작성해주세요 (최소 20자)</p>
              </div>
            </div>
            <textarea
              value={career}
              onChange={(e) => setCareer(e.target.value)}
              className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl focus:border-[#5A7BFF] focus:outline-none resize-none transition-colors"
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

          {/* Available Time Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center mb-6">
              <i className="ri-calendar-check-line text-3xl text-[#5A7BFF] mr-3"></i>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">가능 시간</h2>
                <p className="text-sm text-gray-600">멘토링이 가능한 요일과 시간대를 선택해주세요</p>
              </div>
            </div>

            <div className="space-y-4">
              {DAYS_OF_WEEK.map(({ key, label }) => (
                <div key={key} className="border-2 border-gray-100 rounded-xl p-4 hover:border-[#5A7BFF]/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 text-lg">{label}</h3>
                    {availableTime[key] && availableTime[key].length > 0 && (
                      <span className="text-sm text-[#5A7BFF] font-medium">
                        {availableTime[key].length}개 시간대 선택됨
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const isSelected = availableTime[key]?.includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => handleTimeToggle(key, slot)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center">
                <i className="ri-information-line text-[#5A7BFF] text-xl mr-2"></i>
                <p className="text-sm text-gray-700">
                  선택된 시간대: <span className="font-bold text-[#5A7BFF]">
                    {Object.values(availableTime).reduce((sum, times) => sum + times.length, 0)}개
                  </span>
                </p>
              </div>
              {Object.keys(availableTime).length > 0 && (
                <i className="ri-checkbox-circle-fill text-green-500 text-xl"></i>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(`/mentors/${id}`)}
              className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-300 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving || bio.length < 50 || career.length < 20 || Object.keys(availableTime).length === 0}
              className="flex-1 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white py-4 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
