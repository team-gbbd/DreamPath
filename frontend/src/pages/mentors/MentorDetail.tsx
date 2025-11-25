import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mentorService } from '@/lib/api';

interface Mentor {
  mentorId: number;
  userId: number;
  bio: string;
  career: string;
  availableTime: Record<string, string[]>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const DAY_LABELS: Record<string, string> = {
  monday: '월요일',
  tuesday: '화요일',
  wednesday: '수요일',
  thursday: '목요일',
  friday: '금요일',
  saturday: '토요일',
  sunday: '일요일',
};

export default function MentorDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const isOwnProfile = userId && mentor && userId === mentor.userId;

  useEffect(() => {
    if (id) {
      fetchMentor();
    }
  }, [id]);

  const fetchMentor = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);

      const data = await mentorService.getMentorDetail(parseInt(id));
      setMentor(data);
    } catch (err: any) {
      console.error('멘토 정보 로딩 실패:', err);
      setError(err.response?.data || '멘토 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalAvailableSlots = (availableTime: Record<string, string[]>) => {
    return Object.values(availableTime).reduce((sum, times) => sum + times.length, 0);
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

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-error-warning-line text-6xl text-red-500 mb-4"></i>
          <p className="text-xl text-gray-700 font-medium mb-4">{error || '멘토를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate('/mentors')}
            className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            목록으로 돌아가기
          </button>
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
            <button
              onClick={() => navigate('/mentors')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <i className="ri-arrow-left-line text-xl mr-2"></i>
              <span className="font-medium">멘토 목록</span>
            </button>
            {isOwnProfile && (
              <button
                onClick={() => navigate(`/mentors/${mentor.mentorId}/edit`)}
                className="flex items-center text-[#5A7BFF] hover:text-[#8F5CFF] transition-colors font-medium"
              >
                <i className="ri-edit-line mr-1"></i>
                프로필 수정
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-start gap-6 mb-6">
            <div className="w-24 h-24 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-2xl flex items-center justify-center flex-shrink-0">
              <i className="ri-user-line text-white text-5xl"></i>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-800">멘토 프로필</h1>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                  <i className="ri-checkbox-circle-line mr-1"></i>
                  승인됨
                </span>
              </div>
              <p className="text-gray-600 mb-4">
                <i className="ri-calendar-line mr-2"></i>
                멘토 활동 시작일: {new Date(mentor.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <div className="flex gap-4">
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">가능 요일</p>
                  <p className="text-lg font-bold text-blue-800">{Object.keys(mentor.availableTime).length}일</p>
                </div>
                <div className="bg-purple-50 px-4 py-2 rounded-lg">
                  <p className="text-xs text-purple-600 mb-1">가능 시간대</p>
                  <p className="text-lg font-bold text-purple-800">{getTotalAvailableSlots(mentor.availableTime)}개</p>
                </div>
              </div>
            </div>
          </div>

          {isOwnProfile && (
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <i className="ri-information-line mr-2"></i>
                본인의 프로필입니다. 우측 상단의 "프로필 수정" 버튼으로 정보를 수정할 수 있습니다.
              </p>
            </div>
          )}
        </div>

        {/* Bio Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <i className="ri-quill-pen-line text-[#5A7BFF] mr-3"></i>
            자기소개
          </h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{mentor.bio}</p>
        </div>

        {/* Career Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <i className="ri-briefcase-line text-[#5A7BFF] mr-3"></i>
            경력 사항
          </h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{mentor.career}</p>
        </div>

        {/* Available Time Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <i className="ri-calendar-check-line text-[#5A7BFF] mr-3"></i>
            가능 시간
          </h2>

          <div className="space-y-4">
            {Object.entries(mentor.availableTime).map(([day, times]) => (
              <div key={day} className="border-2 border-gray-100 rounded-xl p-4 hover:border-[#5A7BFF]/30 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 text-lg flex items-center">
                    <i className="ri-calendar-event-line text-[#5A7BFF] mr-2"></i>
                    {DAY_LABELS[day]}
                  </h3>
                  <span className="text-sm text-[#5A7BFF] font-medium">
                    {times.length}개 시간대
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {times.map((time) => (
                    <span
                      key={time}
                      className="bg-gradient-to-r from-blue-50 to-purple-50 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium border border-blue-100"
                    >
                      <i className="ri-time-line mr-1 text-[#5A7BFF]"></i>
                      {time}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-100">
            <p className="text-sm text-gray-700 text-center">
              <i className="ri-information-line text-[#5A7BFF] mr-2"></i>
              총 <span className="font-bold text-[#5A7BFF]">{getTotalAvailableSlots(mentor.availableTime)}</span>개의 시간대에서 멘토링을 받을 수 있습니다.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        {!isOwnProfile && (
          <div className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-2xl shadow-xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-2">이 멘토와 함께 성장하고 싶으신가요?</h2>
            <p className="mb-6 text-white/90">지금 바로 멘토링을 예약하고 전문가의 도움을 받아보세요.</p>
            <div className="flex gap-4">
              <button
                onClick={() => navigate(`/mentoring/book/${mentor.mentorId}`)}
                className="flex-1 bg-white text-[#5A7BFF] py-4 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-lg"
              >
                <i className="ri-calendar-check-line mr-2"></i>
                멘토링 예약하기
              </button>
              <button
                onClick={() => navigate('/mentors')}
                className="px-6 bg-white/20 backdrop-blur-sm text-white py-4 rounded-xl font-bold hover:bg-white/30 transition-colors border-2 border-white/30"
              >
                <i className="ri-arrow-left-line mr-2"></i>
                다른 멘토 보기
              </button>
            </div>
          </div>
        )}

        {isOwnProfile && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl shadow-xl p-8 border-2 border-purple-100">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">멘토 활동을 시작해보세요</h2>
            <p className="mb-6 text-gray-600">멘티들의 예약을 확인하고 멘토링 일정을 관리할 수 있습니다.</p>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/mentor/sessions')}
                className="flex-1 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white py-4 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg"
              >
                <i className="ri-calendar-event-line mr-2"></i>
                내 멘토링 일정 보기
              </button>
              <button
                onClick={() => navigate(`/mentors/${mentor.mentorId}/edit`)}
                className="px-6 bg-white text-[#5A7BFF] py-4 rounded-xl font-bold hover:bg-gray-50 transition-colors border-2 border-[#5A7BFF]/20"
              >
                <i className="ri-edit-line mr-2"></i>
                프로필 수정
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
