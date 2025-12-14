package com.dreampath.domain.mentoring.service;

import com.dreampath.domain.mentoring.dto.booking.BookingRequest;
import com.dreampath.domain.mentoring.dto.booking.BookingResponse;
import com.dreampath.domain.mentoring.dto.booking.ConfirmRejectRequest;
import com.dreampath.domain.mentoring.entity.MentoringBooking;
import com.dreampath.domain.mentoring.entity.MentoringSession;
import com.dreampath.domain.user.entity.User;
import com.dreampath.global.enums.BookingStatus;
import com.dreampath.global.exception.ResourceNotFoundException;
import com.dreampath.domain.mentoring.repository.MentorRepository;
import com.dreampath.domain.mentoring.repository.MentoringBookingRepository;
import com.dreampath.domain.mentoring.repository.MentoringSessionRepository;
import com.dreampath.domain.user.repository.UserRepository;
import com.dreampath.domain.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MentoringBookingService {

    private final MentoringBookingRepository bookingRepository;
    private final MentoringSessionRepository sessionRepository;
    private final MentorRepository mentorRepository;
    private final UserRepository userRepository;
    private final PaymentService paymentService;
    private final LiveKitService liveKitService;

    /**
     * 멘토링 예약 생성 (세션 기반)
     */
    @Transactional
    public BookingResponse createBooking(BookingRequest request) {
        log.info("멘토링 예약 생성 - sessionId: {}, menteeId: {}",
                request.getSessionId(), request.getMenteeId());

        // 1. 세션, 멘티 조회
        MentoringSession session = sessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Session", "id", request.getSessionId()));

        User mentee = userRepository.findById(request.getMenteeId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getMenteeId()));

        // 2. 세션 활성화 여부 확인
        if (!session.getIsActive()) {
            throw new RuntimeException("비활성화된 세션입니다.");
        }

        // 3. 세션 마감 여부 확인
        if (session.isFull()) {
            throw new RuntimeException("이미 마감된 세션입니다.");
        }

        // 4. 잔여 이용권 확인
        int remainingSessions = paymentService.getRemainingSessions(request.getMenteeId());
        if (remainingSessions < 1) {
            throw new RuntimeException("잔여 멘토링 횟수가 부족합니다. 이용권을 구매해주세요.");
        }

        // 5. 예약 생성
        MentoringBooking booking = new MentoringBooking();
        booking.setSession(session);
        booking.setMentee(mentee);
        // bookingDate, timeSlot은 세션 정보에서 추출
        booking.setBookingDate(session.getSessionDate().toLocalDate().toString());
        booking.setTimeSlot(session.getSessionDate().toLocalTime().toString());
        booking.setMessage(request.getMessage());
        booking.setStatus(BookingStatus.PENDING);

        MentoringBooking savedBooking = bookingRepository.save(booking);

        // 6. 세션 참가자 수 증가
        session.incrementParticipants();
        sessionRepository.save(session);

        // 7. 이용권 1회 차감
        paymentService.useSessions(
                request.getMenteeId(),
                1,
                savedBooking.getBookingId(),
                "멘토링 예약 (세션: " + session.getTitle() + ")"
        );

        log.info("멘토링 예약 생성 완료 - bookingId: {}", savedBooking.getBookingId());

        return BookingResponse.from(savedBooking);
    }

    /**
     * 내 예약 목록 조회 (멘티)
     */
    public List<BookingResponse> getMyBookings(Long menteeId) {
        log.info("멘티 예약 목록 조회 - menteeId: {}", menteeId);

        User mentee = userRepository.findById(menteeId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", menteeId));

        return bookingRepository.findByMenteeOrderByCreatedAtDesc(mentee).stream()
                .map(BookingResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 멘토의 예약 목록 조회
     */
    public List<BookingResponse> getMentorBookings(Long mentorId) {
        log.info("멘토 예약 목록 조회 - mentorId: {}", mentorId);

        return bookingRepository.findByMentorIdOrderByCreatedAtDesc(mentorId).stream()
                .map(BookingResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 예약 확정 (멘토)
     */
    @Transactional
    public BookingResponse confirmBooking(Long bookingId) {
        log.info("예약 확정 - bookingId: {}", bookingId);

        MentoringBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", bookingId));

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("대기 중인 예약만 확정할 수 있습니다.");
        }

        // LiveKit 회의 URL 생성
        String roomName = "mentoring-" + bookingId;
        String meetingUrl = liveKitService.getLivekitUrl() + "?room=" + roomName;

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setMeetingUrl(meetingUrl);

        MentoringBooking savedBooking = bookingRepository.save(booking);

        log.info("예약 확정 완료 - bookingId: {}, meetingUrl: {}", bookingId, meetingUrl);

        return BookingResponse.from(savedBooking);
    }

    /**
     * 예약 거절 (멘토)
     */
    @Transactional
    public BookingResponse rejectBooking(Long bookingId, ConfirmRejectRequest request) {
        log.info("예약 거절 - bookingId: {}", bookingId);

        MentoringBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", bookingId));

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("대기 중인 예약만 거절할 수 있습니다.");
        }

        booking.setStatus(BookingStatus.REJECTED);
        booking.setRejectionReason(request.getReason());

        MentoringBooking savedBooking = bookingRepository.save(booking);

        // 잔여 횟수 환불
        paymentService.refundSessions(
                booking.getMentee().getUserId(),
                1,
                bookingId,
                "예약 거절 (사유: " + request.getReason() + ")"
        );

        log.info("예약 거절 완료 - bookingId: {}", bookingId);

        return BookingResponse.from(savedBooking);
    }

    /**
     * 예약 취소 (멘티)
     */
    @Transactional
    public BookingResponse cancelBooking(Long bookingId) {
        log.info("예약 취소 - bookingId: {}", bookingId);

        MentoringBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", bookingId));

        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new RuntimeException("대기 중이거나 확정된 예약만 취소할 수 있습니다.");
        }

        booking.setStatus(BookingStatus.CANCELLED);

        MentoringBooking savedBooking = bookingRepository.save(booking);

        // 잔여 횟수 환불
        paymentService.refundSessions(
                booking.getMentee().getUserId(),
                1,
                bookingId,
                "예약 취소"
        );

        log.info("예약 취소 완료 - bookingId: {}", bookingId);

        return BookingResponse.from(savedBooking);
    }

    /**
     * 멘토링 완료 처리
     */
    @Transactional
    public BookingResponse completeBooking(Long bookingId) {
        log.info("멘토링 완료 처리 - bookingId: {}", bookingId);

        MentoringBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", bookingId));

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new RuntimeException("확정된 예약만 완료 처리할 수 있습니다.");
        }

        booking.setStatus(BookingStatus.COMPLETED);

        MentoringBooking savedBooking = bookingRepository.save(booking);

        log.info("멘토링 완료 처리 완료 - bookingId: {}", bookingId);

        return BookingResponse.from(savedBooking);
    }

    /**
     * 예약 상세 조회
     */
    public BookingResponse getBookingDetail(Long bookingId) {
        log.info("예약 상세 조회 - bookingId: {}", bookingId);

        MentoringBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", bookingId));

        return BookingResponse.from(booking);
    }

    /**
     * LiveKit 토큰 생성
     */
    public String generateLiveKitToken(Long bookingId, Long userId) {
        log.info("LiveKit 토큰 생성 - bookingId: {}, userId: {}", bookingId, userId);

        MentoringBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", bookingId));

        // 권한 확인 (멘토 또는 멘티만 토큰 생성 가능)
        boolean isMentor = booking.getSession().getMentor().getUser().getUserId().equals(userId);
        boolean isMentee = booking.getMentee().getUserId().equals(userId);

        if (!isMentor && !isMentee) {
            throw new RuntimeException("이 예약에 대한 권한이 없습니다.");
        }

        // 예약이 확정된 상태인지 확인
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new RuntimeException("확정된 예약만 입장할 수 있습니다.");
        }

        // 참여자 이름 설정 (표시용)
        String participantName = isMentor
            ? booking.getSession().getMentor().getUser().getName() + " (멘토)"
            : booking.getMentee().getName() + " (멘티)";

        // 고유 식별자 생성 (userId 기반으로 고유하게)
        String participantIdentity = "user-" + userId;

        // 방 이름 생성
        String roomName = "mentoring-" + bookingId;

        // 토큰 생성 (identity는 고유하게, name은 표시용)
        String token = liveKitService.createToken(roomName, participantName, participantIdentity);

        log.info("LiveKit 토큰 생성 완료 - bookingId: {}, participantName: {}", bookingId, participantName);

        return token;
    }

    /**
     * 멘토 접근 권한 검증 (mentorId 기반)
     */
    public void validateMentorAccess(Long mentorId, Long userId) {
        var mentor = mentorRepository.findById(mentorId)
                .orElseThrow(() -> new ResourceNotFoundException("Mentor", "id", mentorId));

        if (!mentor.getUser().getUserId().equals(userId)) {
            throw new SecurityException("해당 멘토 정보에 대한 접근 권한이 없습니다.");
        }
    }

    /**
     * 예약 접근 권한 검증 (멘토 또는 멘티)
     */
    public void validateBookingAccess(Long bookingId, Long userId) {
        MentoringBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", bookingId));

        boolean isMentor = booking.getSession().getMentor().getUser().getUserId().equals(userId);
        boolean isMentee = booking.getMentee().getUserId().equals(userId);

        if (!isMentor && !isMentee) {
            throw new SecurityException("해당 예약에 대한 접근 권한이 없습니다.");
        }
    }

    /**
     * 멘토 권한 검증 (bookingId 기반)
     */
    public void validateMentorAccessByBooking(Long bookingId, Long userId) {
        MentoringBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", bookingId));

        boolean isMentor = booking.getSession().getMentor().getUser().getUserId().equals(userId);

        if (!isMentor) {
            throw new SecurityException("멘토만 접근할 수 있습니다.");
        }
    }

    /**
     * 멘티 권한 검증 (bookingId 기반)
     */
    public void validateMenteeAccessByBooking(Long bookingId, Long userId) {
        MentoringBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", bookingId));

        boolean isMentee = booking.getMentee().getUserId().equals(userId);

        if (!isMentee) {
            throw new SecurityException("멘티만 접근할 수 있습니다.");
        }
    }
}
