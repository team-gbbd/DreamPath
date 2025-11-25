import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mentorService } from '@/lib/api';

interface Mentor {
  mentorId: number;
  userId: number;
  name: string;
  company: string;
  job: string;
  experience: string;
  bio: string;
  career: string;
  availableTime: Record<string, string[]>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type TabType = 'info' | 'bio' | 'career';

export default function MentorDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');

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
    } catch (err) {
      console.error('멘토 정보 로딩 실패:', err);
      setError(err.response?.data || '멘토 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
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

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <i className="ri-error-warning-line text-5xl text-red-400 mb-4"></i>
          <p className="text-gray-700 mb-4">{error || '멘토를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate('/mentors')}
            className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition-colors"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'info' as TabType, label: '기본 정보', icon: 'ri-user-line' },
    { id: 'bio' as TabType, label: '자기소개', icon: 'ri-quill-pen-line' },
    { id: 'career' as TabType, label: '경력 사항', icon: 'ri-briefcase-line' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/mentors')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <i className="ri-arrow-left-line text-xl mr-2"></i>
              <span>멘토 목록</span>
            </button>
            {isOwnProfile && (
              <button
                onClick={() => navigate(`/mentors/${mentor.mentorId}/edit`)}
                className="flex items-center text-pink-500 hover:text-pink-600 transition-colors"
              >
                <i className="ri-edit-line mr-1"></i>
                프로필 수정
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-5 mb-4">
            <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="ri-user-line text-pink-500 text-4xl"></i>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-800">{mentor.name || '멘토'}</h1>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
                  승인됨
                </span>
              </div>
              <p className="text-gray-600">
                {mentor.company && mentor.job ? `${mentor.company} · ${mentor.job}` : '정보 없음'}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                멘토 활동 시작: {new Date(mentor.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>

          {isOwnProfile && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <i className="ri-information-line mr-2"></i>
                본인의 프로필입니다. 우측 상단의 "프로필 수정" 버튼으로 정보를 수정할 수 있습니다.
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border border-gray-200 rounded-lg mb-6">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-pink-600 border-b-2 border-pink-500 -mb-[1px]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* 기본 정보 탭 */}
            {activeTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">회사</p>
                  <p className="text-gray-800 font-medium">{mentor.company || '미등록'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">직업</p>
                  <p className="text-gray-800 font-medium">{mentor.job || '미등록'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">경력</p>
                  <p className="text-gray-800 font-medium">{mentor.experience || '미등록'}</p>
                </div>
              </div>
            )}

            {/* 자기소개 탭 */}
            {activeTab === 'bio' && (
              <div>
                {mentor.bio ? (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{mentor.bio}</p>
                ) : (
                  <p className="text-gray-400 text-center py-8">등록된 자기소개가 없습니다.</p>
                )}
              </div>
            )}

            {/* 경력 사항 탭 */}
            {activeTab === 'career' && (
              <div>
                {mentor.career ? (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{mentor.career}</p>
                ) : (
                  <p className="text-gray-400 text-center py-8">등록된 경력 사항이 없습니다.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CTA Section */}
        {!isOwnProfile && (
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">이 멘토와 함께 성장하고 싶으신가요?</h2>
            <p className="text-gray-600 mb-4 text-sm">지금 바로 멘토링을 예약하고 전문가의 도움을 받아보세요.</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/mentoring/book/${mentor.mentorId}`)}
                className="flex-1 bg-pink-500 text-white py-3 rounded-lg font-medium hover:bg-pink-600 transition-colors"
              >
                <i className="ri-calendar-check-line mr-2"></i>
                멘토링 예약하기
              </button>
              <button
                onClick={() => navigate('/mentors')}
                className="px-6 bg-white text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors border border-gray-200"
              >
                다른 멘토 보기
              </button>
            </div>
          </div>
        )}

        {isOwnProfile && (
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">멘토 활동을 시작해보세요</h2>
            <p className="text-gray-600 mb-4 text-sm">멘티들의 예약을 확인하고 멘토링 일정을 관리할 수 있습니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/mypage')}
                className="flex-1 bg-pink-500 text-white py-3 rounded-lg font-medium hover:bg-pink-600 transition-colors"
              >
                <i className="ri-calendar-event-line mr-2"></i>
                마이페이지에서 세션 관리
              </button>
              <button
                onClick={() => navigate(`/mentors/${mentor.mentorId}/edit`)}
                className="px-6 bg-white text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors border border-gray-200"
              >
                프로필 수정
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
