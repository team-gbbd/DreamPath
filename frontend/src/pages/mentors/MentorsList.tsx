import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mentorService } from '@/lib/api';

interface Mentor {
  mentorId: number;
  userId: number;
  bio: string;
  career: string;
  availableTime: Record<string, string[]>;
  status: string;
  createdAt: string;
}

const DAY_LABELS: Record<string, string> = {
  monday: '월',
  tuesday: '화',
  wednesday: '수',
  thursday: '목',
  friday: '금',
  saturday: '토',
  sunday: '일',
};

export default function MentorsPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMentors();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMentors(mentors);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = mentors.filter(
        (mentor) =>
          mentor.bio.toLowerCase().includes(query) ||
          mentor.career.toLowerCase().includes(query)
      );
      setFilteredMentors(filtered);
    }
  }, [searchQuery, mentors]);

  const fetchMentors = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await mentorService.getApprovedMentors();
      setMentors(data);
      setFilteredMentors(data);
    } catch (err: any) {
      console.error('멘토 목록 로딩 실패:', err);
      setError(err.response?.data || '멘토 목록을 불러오는 중 오류가 발생했습니다.');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg flex items-center justify-center">
                <i className="ri-team-line text-white text-2xl"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">멘토 찾기</h1>
                <p className="text-sm text-gray-600">전문 멘토와 함께 성장하세요</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <i className="ri-home-line text-2xl"></i>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <i className="ri-search-line absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="멘토의 자기소개나 경력으로 검색하세요..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#5A7BFF] focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="ri-user-star-line text-[#5A7BFF] text-xl"></i>
            <span className="text-gray-700">
              총 <span className="font-bold text-[#5A7BFF]">{filteredMentors.length}</span>명의 멘토
            </span>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              <i className="ri-close-line mr-1"></i>
              검색 초기화
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start">
            <i className="ri-error-warning-line text-red-500 text-xl mr-3 mt-0.5"></i>
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Mentors Grid */}
        {filteredMentors.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <i className="ri-user-search-line text-6xl text-gray-300 mb-4"></i>
            <p className="text-gray-500 text-lg mb-2">
              {searchQuery ? '검색 결과가 없습니다.' : '현재 활동 중인 멘토가 없습니다.'}
            </p>
            {searchQuery && (
              <p className="text-gray-400 text-sm">다른 키워드로 검색해보세요.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMentors.map((mentor) => (
              <div
                key={mentor.mentorId}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-[#5A7BFF]/30"
                onClick={() => navigate(`/mentors/${mentor.mentorId}`)}
              >
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="ri-user-line text-white text-2xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-lg">멘토 #{mentor.mentorId}</h3>
                    <p className="text-sm text-gray-500">
                      <i className="ri-calendar-line mr-1"></i>
                      {new Date(mentor.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>

                {/* Bio */}
                <div className="mb-4">
                  <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                    {mentor.bio}
                  </p>
                </div>

                {/* Career */}
                <div className="mb-4 bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">주요 경력</p>
                  <p className="text-sm text-gray-800 line-clamp-2 font-medium">
                    {mentor.career}
                  </p>
                </div>

                {/* Available Time */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">가능 시간</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(mentor.availableTime).slice(0, 4).map(([day, times]) => (
                      <span
                        key={day}
                        className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium"
                      >
                        {DAY_LABELS[day]} {times.length}개
                      </span>
                    ))}
                    {Object.keys(mentor.availableTime).length > 4 && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                        +{Object.keys(mentor.availableTime).length - 4}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    총 <span className="font-bold text-[#5A7BFF]">{getTotalAvailableSlots(mentor.availableTime)}</span>개 시간대 가능
                  </p>
                </div>

                {/* CTA Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/mentors/${mentor.mentorId}`);
                  }}
                  className="w-full bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  <i className="ri-user-search-line mr-2"></i>
                  프로필 보기
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
