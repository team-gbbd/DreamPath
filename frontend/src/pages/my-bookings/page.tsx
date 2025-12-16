import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '@/lib/api';

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
  mentorName?: string;
  mentorBio?: string;
}

export default function MyBookingsPage() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  const getCurrentUserId = (): number => {
    const user = localStorage.getItem('dreampath:user');
    if (user) {
      const userData = JSON.parse(user);
      return userData.userId;
    }
    return 1; // 임시
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const userId = getCurrentUserId();
      const data = await bookingService.getMyBookings(userId);
      setBookings(data);
      setIsLoading(false);
    } catch (error) {
      console.error('예약 목록 조회 실패:', error);
      setIsLoading(false);
    }
  };

  const getRefundInfo = (booking: Booking | null) => {
    if (!booking) return { refundRate: 0, fee: 0, hoursLeft: 0 };

    const bookingDateTime = new Date(`${booking.bookingDate} ${booking.timeSlot.split('-')[0]}`);
    const now = new Date();
    const hoursLeft = Math.floor((bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));

    let refundRate = 0;
    if (hoursLeft >= 120) {
      refundRate = 100;
    } else if (hoursLeft >= 24) {
      refundRate = 30;
    } else {
      refundRate = 0;
    }

    const fee = 100 - refundRate;

    return { refundRate, fee, hoursLeft };
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!cancelReason) {
      alert('취소 사유를 선택해주세요.');
      return;
    }

    if (cancelReason === '기타' && !customReason.trim()) {
      alert('취소 사유를 입력해주세요.');
      return;
    }

    try {
      const finalReason = cancelReason === '기타' ? customReason : cancelReason;
      await bookingService.cancelBooking(bookingId);
      alert('예약이 취소되었습니다. 잔여 횟수가 복구되었습니다.');
      setShowCancelModal(false);
      setSelectedBooking(null);
      setCancelReason('');
      setCustomReason('');
      fetchBookings();
    } catch (error) {
      console.error('예약 취소 실패:', error);
      alert(error.response?.data?.message || '예약 취소 중 오류가 발생했습니다.');
    }
  };

  const handleJoinMeeting = (bookingId: number) => {
    navigate(`/mentoring/meeting/${bookingId}`);
  };

  const isBookingPast = (booking: Booking): boolean => {
    // timeSlot이 "HH:MM-HH:MM" 형식이면 끝 시간 사용, 아니면 시작 시간 + 1시간
    const timeSlotParts = booking.timeSlot.split('-');
    let endTime: string;
    if (timeSlotParts.length === 2) {
      endTime = timeSlotParts[1];
    } else {
      // "HH:MM" 또는 "HH:MM:SS" 형식 - 1시간 후로 가정
      endTime = booking.timeSlot.substring(0, 5);
    }
    const bookingDateTime = new Date(`${booking.bookingDate}T${endTime}:00`);
    // 1시간 추가 (세션 기반 예약의 경우)
    if (timeSlotParts.length === 1) {
      bookingDateTime.setHours(bookingDateTime.getHours() + 1);
    }
    const now = new Date();
    return bookingDateTime < now;
  };

  const canJoinMeeting = (booking: Booking): boolean => {
    // timeSlot이 "HH:MM-HH:MM" 형식이면 시작 시간 사용, 아니면 전체 사용
    const timeSlotParts = booking.timeSlot.split('-');
    let startTime: string;
    if (timeSlotParts.length === 2 && timeSlotParts[0].length <= 5) {
      startTime = timeSlotParts[0];
    } else {
      // "HH:MM" 또는 "HH:MM:SS" 형식
      startTime = booking.timeSlot.substring(0, 5);
    }
    const bookingStartTime = new Date(`${booking.bookingDate}T${startTime}:00`);
    const now = new Date();
    const minutesBeforeStart = 10; // 10분 전부터 입장 가능
    const allowedStartTime = new Date(bookingStartTime.getTime() - minutesBeforeStart * 60 * 1000);

    return now >= allowedStartTime && !isBookingPast(booking);
  };

  const upcomingBookings = bookings.filter(
    (b) => (b.status === 'PENDING' || b.status === 'CONFIRMED') && !isBookingPast(b)
  );

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentBookings = activeTab === 'upcoming' ? upcomingBookings : completedBookings;

  return (
    <div className="min-h-screen bg-gray-50">
      

      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/mentoring')}
            className="mb-6 text-gray-600 hover:text-gray-800 transition-colors flex items-center"
          >
            <i className="ri-arrow-left-line text-xl mr-1"></i>
            <span className="text-sm">뒤로 가기</span>
          </button>

          {/* Main Container */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-pink-300 p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">내 예약 목록</h1>

        {/* Tabs */}
        <div className="flex space-x-3 mb-6">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-5 py-2 rounded-lg font-semibold transition-all text-sm ${
              activeTab === 'upcoming'
                ? 'bg-pink-500 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            예정된 예약 ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-5 py-2 rounded-lg font-semibold transition-all text-sm ${
              activeTab === 'completed'
                ? 'bg-pink-500 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            지난 예약 ({completedBookings.length})
          </button>
        </div>

        {/* Bookings List */}
        {currentBookings.length === 0 ? (
          <div className="bg-white rounded-lg border-2 border-dashed border-pink-300 p-12 text-center">
            <i className="ri-calendar-line text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {activeTab === 'upcoming' ? '예정된 예약이 없습니다' : '지난 예약이 없습니다'}
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'upcoming' && '멘토를 찾아 멘토링을 예약해보세요'}
            </p>
            {activeTab === 'upcoming' && (
              <button
                onClick={() => navigate('/mentoring')}
                className="bg-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-600 transition-colors"
              >
                멘토 찾기
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {currentBookings.map((booking) => (
              <div key={booking.bookingId} className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      {booking.mentorName ? `${booking.mentorName} 멘토` : '멘토링'} #{booking.bookingId}
                    </h3>
                    {booking.mentorBio && (
                      <p className="text-sm text-gray-600">{booking.mentorBio}</p>
                    )}
                  </div>
                  {getStatusBadge(booking.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
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
                    <p className="text-xs text-gray-500 mb-1">전달한 메시지</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{booking.message}</p>
                  </div>
                )}

                {booking.rejectionReason && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-red-600">거절:</span> {booking.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {booking.status === 'CONFIRMED' && booking.meetingUrl && !isBookingPast(booking) && (
                    <button
                      onClick={() => handleJoinMeeting(booking.bookingId)}
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

                  {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && !isBookingPast(booking) && (
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowCancelModal(true);
                      }}
                      className="flex-1 bg-white text-gray-700 py-2 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <i className="ri-close-line mr-1"></i>
                      취소
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && selectedBooking && (() => {
        const { refundRate, fee, hoursLeft } = getRefundInfo(selectedBooking);
        const cancelReasons = [
          '일정이 맞지 않아서',
          '개인 사정으로',
          '다른 멘토를 선택하고 싶어서',
          '기타'
        ];

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-4">예약 취소</h3>

              {/* 예약 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">날짜</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedBooking.bookingDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">시간</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedBooking.timeSlot}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">상태</p>
                  {getStatusBadge(selectedBooking.status)}
                </div>
              </div>

              {/* 취소 사유 선택 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  취소 사유 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {cancelReasons.map((reason) => (
                    <label key={reason} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="cancelReason"
                        value={reason}
                        checked={cancelReason === reason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{reason}</span>
                    </label>
                  ))}
                </div>

                {/* 기타 사유 직접 입력 */}
                {cancelReason === '기타' && (
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="취소 사유를 입력해주세요"
                    rows={3}
                    className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-pink-400 focus:ring-2 focus:ring-pink-200 focus:outline-none resize-none text-sm"
                  />
                )}
              </div>

              {/* 환불 정책 안내 */}
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-bold text-gray-800 mb-2">
                  <i className="ri-information-line mr-1"></i>
                  취소 수수료 안내
                </p>
                <div className="text-xs text-gray-700 space-y-1 mb-3">
                  <p>• 120시간 전 취소: 100% 환불</p>
                  <p>• 120시간 ~ 24시간 전 취소: 30% 환불 (70% 수수료)</p>
                  <p>• 24시간 내 취소: 환불 불가 (100% 수수료)</p>
                </div>

                <div className="border-t border-yellow-300 pt-3 mt-3">
                  <p className="text-sm font-semibold text-gray-800">
                    예약까지 남은 시간: <span className="text-pink-600">{Math.floor(hoursLeft / 24)}일 {hoursLeft % 24}시간</span>
                  </p>
                  <p className="text-sm font-semibold text-gray-800 mt-1">
                    환불율: <span className={refundRate === 100 ? 'text-green-600' : refundRate === 0 ? 'text-red-600' : 'text-orange-600'}>{refundRate}%</span>
                  </p>
                  {fee > 0 && (
                    <p className="text-sm font-semibold text-red-600 mt-1">
                      수수료: {fee}%
                    </p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setSelectedBooking(null);
                    setCancelReason('');
                    setCustomReason('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  닫기
                </button>
                <button
                  onClick={() => handleCancelBooking(selectedBooking.bookingId)}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                >
                  취소하기
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
