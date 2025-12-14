import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService, mentorService } from '@/lib/api';

interface Booking {
  bookingId: number;
  mentorId: number;
  menteeId: number;
  bookingDate: string;
  timeSlot: string;
  message: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  rejectionReason: string;
  meetingUrl: string;
  createdAt: string;
  updatedAt: string;
}

interface MentorInfo {
  mentorId: number;
  userId: number;
  username: string;
  name: string;
  bio: string;
  career: string;
  availableTime: Record<string, string[]>;
  status: string;
}

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
  '09:00-10:00', '10:00-11:00', '11:00-12:00',
  '13:00-14:00', '14:00-15:00', '15:00-16:00',
  '16:00-17:00', '17:00-18:00', '18:00-19:00',
  '19:00-20:00', '20:00-21:00'
];

export default function MentorSessionsPage() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'completed'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [mentorId, setMentorId] = useState<number | null>(null);
  const [mentorInfo, setMentorInfo] = useState<MentorInfo | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [availableTime, setAvailableTime] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  const getCurrentUserId = (): number => {
    const user = localStorage.getItem('dreampath:user');
    if (user) {
      const userData = JSON.parse(user);
      return userData.userId;
    }
    return 1; // 임시
  };

  useEffect(() => {
    fetchMentorId();
  }, []);

  useEffect(() => {
    if (mentorId) {
      fetchBookings();
    }
  }, [mentorId]);

  const fetchMentorId = async () => {
    try {
      const userId = getCurrentUserId();
      const mentorData = await mentorService.getMyApplication(userId);
      setMentorId(mentorData.mentorId);
      setMentorInfo(mentorData);
      // 기존 일정 불러오기
      if (mentorData.availableTime) {
        setAvailableTime(mentorData.availableTime);
      }
    } catch (error: any) {
      console.error('멘토 정보 조회 실패:', error);
      alert('멘토로 승인된 사용자만 접근할 수 있습니다.');
      navigate('/profile/dashboard');
    }
  };

  const fetchBookings = async () => {
    if (!mentorId) return;

    try {
      const data = await bookingService.getMentorBookings(mentorId);
      setBookings(data);
      setIsLoading(false);
    } catch (error: any) {
      console.error('예약 목록 조회 실패:', error);
      setIsLoading(false);
    }
  };

  const handleConfirm = async (bookingId: number) => {
    try {
      await bookingService.confirmBooking(bookingId);
      alert('예약이 확정되었습니다! 화상 회의 URL이 생성되었습니다.');
      fetchBookings();
    } catch (error: any) {
      console.error('예약 확정 실패:', error);
      alert(error.response?.data?.message || '예약 확정 중 오류가 발생했습니다.');
    }
  };

  const handleReject = async () => {
    if (!selectedBooking) return;

    if (rejectionReason.trim().length < 10) {
      alert('거절 사유를 최소 10자 이상 입력해주세요.');
      return;
    }

    try {
      await bookingService.rejectBooking(selectedBooking.bookingId, rejectionReason);
      alert('예약이 거절되었습니다. 멘티의 잔여 횟수가 복구되었습니다.');
      setShowRejectModal(false);
      setSelectedBooking(null);
      setRejectionReason('');
      fetchBookings();
    } catch (error: any) {
      console.error('예약 거절 실패:', error);
      alert(error.response?.data?.message || '예약 거절 중 오류가 발생했습니다.');
    }
  };

  const handleComplete = async (bookingId: number) => {
    if (!confirm('멘토링을 완료 처리하시겠습니까?')) return;

    try {
      await bookingService.completeBooking(bookingId);
      alert('멘토링이 완료 처리되었습니다.');
      fetchBookings();
    } catch (error: any) {
      console.error('완료 처리 실패:', error);
      alert(error.response?.data?.message || '완료 처리 중 오류가 발생했습니다.');
    }
  };

  const handleJoinMeeting = (meetingUrl: string) => {
    window.open(meetingUrl, '_blank');
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

  const handleSaveSchedule = async () => {
    if (Object.keys(availableTime).length === 0) {
      alert('최소 1개 이상의 가능 시간을 선택해주세요.');
      return;
    }

    if (!mentorInfo) {
      alert('멘토 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      setIsSaving(true);

      await mentorService.updateMentorProfile(mentorInfo.mentorId, {
        userId: getCurrentUserId(),
        bio: mentorInfo.bio,
        career: mentorInfo.career,
        availableTime: availableTime,
      });

      alert('멘토링 일정이 성공적으로 등록되었습니다!');
      setShowScheduleModal(false);

      // 정보 새로고침
      fetchMentorId();
    } catch (error: any) {
      console.error('일정 등록 실패:', error);
      alert(error.response?.data || '일정 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const isBookingPast = (booking: Booking): boolean => {
    const endTime = booking.timeSlot.split('-')[1];
    const bookingDateTime = new Date(`${booking.bookingDate}T${endTime}:00`);
    const now = new Date();
    return bookingDateTime < now;
  };

  const canJoinMeeting = (booking: Booking): boolean => {
    const startTime = booking.timeSlot.split('-')[0];
    const bookingStartTime = new Date(`${booking.bookingDate}T${startTime}:00`);
    const now = new Date();
    const minutesBeforeStart = 10; // 10분 전부터 입장 가능
    const allowedStartTime = new Date(bookingStartTime.getTime() - minutesBeforeStart * 60 * 1000);

    return now >= allowedStartTime && !isBookingPast(booking);
  };

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING' && !isBookingPast(b));
  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED' && !isBookingPast(b));
  const completedBookings = bookings.filter(
    (b) => b.status === 'COMPLETED' || b.status === 'REJECTED' || b.status === 'CANCELLED' || isBookingPast(b)
  );

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'PENDING':
        return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
          <i className="ri-time-line mr-1"></i>승인 대기
        </span>;
      case 'CONFIRMED':
        return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
          <i className="ri-checkbox-circle-line mr-1"></i>확정됨
        </span>;
      case 'REJECTED':
        return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold">
          <i className="ri-close-circle-line mr-1"></i>거절됨
        </span>;
      case 'CANCELLED':
        return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-bold">
          <i className="ri-close-line mr-1"></i>취소됨
        </span>;
      case 'COMPLETED':
        return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
          <i className="ri-check-double-line mr-1"></i>완료
        </span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  const getCurrentBookings = () => {
    switch (activeTab) {
      case 'pending':
        return pendingBookings;
      case 'confirmed':
        return confirmedBookings;
      case 'completed':
        return completedBookings;
    }
  };

  const currentBookings = getCurrentBookings();

  return (
    <div className="min-h-screen bg-gray-50">
      

      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/mentoring')}
            className="mb-6 text-gray-600 hover:text-gray-800 transition-colors flex items-center"
          >
            <i className="ri-arrow-left-line text-xl mr-1"></i>
            <span className="text-sm">멘토 찾기로</span>
          </button>

          {/* 일정 등록 버튼 */}
          <button
            onClick={() => setShowScheduleModal(true)}
            className="mb-6 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center"
          >
            <i className="ri-calendar-check-line mr-2"></i>
            멘토링 일정 {mentorInfo?.availableTime && Object.keys(mentorInfo.availableTime).length > 0 ? '수정하기' : '등록하기'}
          </button>

          {/* Main Container */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-pink-300 p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">멘토링 세션 관리</h1>
            <p className="text-gray-600 mb-6">예약 요청을 확인하고 관리하세요</p>

            {/* Tabs */}
            <div className="flex space-x-3 mb-6">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-5 py-2 rounded-lg font-semibold transition-all text-sm ${
                  activeTab === 'pending'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                예약 요청 ({pendingBookings.length})
              </button>
              <button
                onClick={() => setActiveTab('confirmed')}
                className={`px-5 py-2 rounded-lg font-semibold transition-all text-sm ${
                  activeTab === 'confirmed'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                확정된 예약 ({confirmedBookings.length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-5 py-2 rounded-lg font-semibold transition-all text-sm ${
                  activeTab === 'completed'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                완료/취소 ({completedBookings.length})
              </button>
            </div>

            {/* Bookings List */}
            {currentBookings.length === 0 ? (
              <div className="bg-white rounded-lg border-2 border-dashed border-pink-300 p-12 text-center">
                <i className="ri-calendar-line text-6xl text-gray-300 mb-4"></i>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {activeTab === 'pending' && '예약 요청이 없습니다'}
                  {activeTab === 'confirmed' && '확정된 예약이 없습니다'}
                  {activeTab === 'completed' && '완료된 예약이 없습니다'}
                </h3>
              </div>
            ) : (
              <div className="space-y-4">
                {currentBookings.map((booking) => (
                  <div
                    key={booking.bookingId}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-800">예약 #{booking.bookingId}</h3>
                      {getStatusBadge(booking.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">멘티 ID</p>
                        <p className="text-sm font-semibold text-gray-800">{booking.menteeId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">날짜</p>
                        <p className="text-sm font-semibold text-gray-800">{booking.bookingDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">시간</p>
                        <p className="text-sm font-semibold text-gray-800">{booking.timeSlot}</p>
                      </div>
                    </div>

                    {booking.message && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <p className="text-xs text-gray-500 mb-1">전달받은 메시지</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{booking.message}</p>
                      </div>
                    )}

                    {booking.rejectionReason && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold text-red-600">거절 사유:</span> {booking.rejectionReason}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {booking.status === 'PENDING' && !isBookingPast(booking) && (
                        <>
                          <button
                            onClick={() => handleConfirm(booking.bookingId)}
                            className="flex-1 bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors"
                          >
                            <i className="ri-check-line mr-1"></i>
                            확정하기
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowRejectModal(true);
                            }}
                            className="flex-1 bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors"
                          >
                            <i className="ri-close-line mr-1"></i>
                            거절하기
                          </button>
                        </>
                      )}

                      {booking.status === 'CONFIRMED' && !isBookingPast(booking) && (
                        <>
                          {booking.meetingUrl && (
                            <button
                              onClick={() => handleJoinMeeting(booking.meetingUrl)}
                              disabled={!canJoinMeeting(booking)}
                              className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                                canJoinMeeting(booking)
                                  ? 'bg-pink-500 text-white hover:bg-pink-600'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <i className="ri-video-line mr-1"></i>
                              입장하기
                            </button>
                          )}
                          <button
                            onClick={() => handleComplete(booking.bookingId)}
                            className="flex-1 bg-white text-gray-700 py-2 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
                          >
                            <i className="ri-check-double-line mr-1"></i>
                            완료 처리
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">예약 상세 정보</h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedBooking(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">예약 ID</p>
                <p className="font-bold text-gray-800">#{selectedBooking.bookingId}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">상태</p>
                {getStatusBadge(selectedBooking.status)}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">멘티 ID</p>
                <p className="font-bold text-gray-800">{selectedBooking.menteeId}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">날짜</p>
                <p className="font-bold text-gray-800">{selectedBooking.bookingDate}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">시간</p>
                <p className="font-bold text-gray-800">{selectedBooking.timeSlot}</p>
              </div>

              {selectedBooking.message && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">멘티 메시지</p>
                  <p className="text-gray-800">{selectedBooking.message}</p>
                </div>
              )}

              {selectedBooking.meetingUrl && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">화상 회의 URL</p>
                  <p className="text-blue-800 break-all text-sm">{selectedBooking.meetingUrl}</p>
                </div>
              )}

              {selectedBooking.rejectionReason && (
                <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
                  <p className="text-sm text-gray-600 mb-2">거절 사유</p>
                  <p className="text-red-800">{selectedBooking.rejectionReason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">예약일</p>
                  <p className="text-gray-800 text-sm">{new Date(selectedBooking.createdAt).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">수정일</p>
                  <p className="text-gray-800 text-sm">{new Date(selectedBooking.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowDetailModal(false);
                setSelectedBooking(null);
              }}
              className="w-full mt-6 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">예약 거절</h3>
            <p className="text-gray-600 mb-4">
              예약을 거절하시겠습니까? 멘티의 차감된 1회가 복구됩니다.
            </p>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600 mb-1">날짜</p>
              <p className="font-bold text-gray-800 mb-2">
                {selectedBooking.bookingDate} {selectedBooking.timeSlot}
              </p>
              <p className="text-sm text-gray-600 mb-1">멘티 ID</p>
              <p className="font-bold text-gray-800">{selectedBooking.menteeId}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                거절 사유 (필수, 최소 10자)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="거절 사유를 입력해주세요."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-pink-400 focus:ring-2 focus:ring-pink-200 focus:outline-none resize-none text-sm"
              />
              <p className="text-sm text-gray-500 mt-1">{rejectionReason.length} / 10자 이상</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedBooking(null);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={rejectionReason.trim().length < 10}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-colors ${
                  rejectionReason.trim().length < 10
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                거절하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일정 등록 모달 */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">멘토링 일정 등록</h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-6">멘토링이 가능한 요일과 시간대를 선택해주세요</p>

              <div className="space-y-4">
                {DAYS_OF_WEEK.map(({ key, label }) => (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-800">{label}</h3>
                      {availableTime[key] && availableTime[key].length > 0 && (
                        <span className="text-sm text-pink-600 font-medium">
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
                                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
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

              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveSchedule}
                  disabled={isSaving || Object.keys(availableTime).length === 0}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
