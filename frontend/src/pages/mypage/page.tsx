import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mentorService, userService } from '@/lib/api';
import StudentMyPage from './StudentMyPage';
import MentorMyPage from './MentorMyPage';
import AdminMyPage from './AdminMyPage';
import { useToast } from '@/components/common/Toast';

interface UserProfile {
  userId: number;
  username: string;
  name: string;
  email: string;
  phone: string;
  birth: string;
  provider: string;
  role: string;
  createdAt: string;
  isActive: boolean;
}

interface MentorApplication {
  mentorId: number;
  userId: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export default function MyPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [mentorApplication, setMentorApplication] = useState<MentorApplication | null>(null);

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
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);

      const profileData = await userService.getUserProfile(userId);
      setUserProfile(profileData);

      try {
        const mentorData = await mentorService.getMyApplication(userId);
        setMentorApplication(mentorData);
      } catch (err) {
        if (err.response?.status !== 404) {
          console.error('멘토 신청 현황 조회 실패:', err);
        }
      }

    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      alert('데이터를 불러오는 중 오류가 발생했습니다.');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) return null;

  // 역할별 페이지 렌더링
  // 1. ADMIN: 어드민 전용 페이지
  if (userProfile.role === 'ADMIN') {
    return <AdminMyPage />;
  }

  // 2. MENTOR (승인된 멘토): 멘토 전용 페이지
  if (mentorApplication && mentorApplication.status === 'APPROVED') {
    return <MentorMyPage />;
  }

  // 3. 일반 USER (또는 멘토 신청 중/거절): 학생 페이지
  return <StudentMyPage />;
}
