package com.dreampath.domain.mentoring.controller;

import com.dreampath.domain.mentoring.dto.booking.BookingRequest;
import com.dreampath.domain.mentoring.dto.booking.BookingResponse;
import com.dreampath.domain.mentoring.dto.booking.ConfirmRejectRequest;
import com.dreampath.domain.mentoring.service.MentoringBookingService;
import com.dreampath.global.jwt.JwtUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/mentoring-bookings")
@RequiredArgsConstructor
public class MentoringBookingController {

    private final MentoringBookingService bookingService;

    /**
     * 멘토링 예약 생성 (본인만 가능)
     * POST /api/mentoring-bookings
     */
    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(
            @Valid @RequestBody BookingRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("멘토링 예약 생성 API - sessionId: {}, menteeId: {}", request.getSessionId(), request.getMenteeId());

        validateOwnership(principal, request.getMenteeId());

        BookingResponse response = bookingService.createBooking(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 내 예약 목록 조회 (멘티, 본인만 조회 가능)
     * GET /api/mentoring-bookings/mentee/{userId}
     */
    @GetMapping("/mentee/{userId}")
    public ResponseEntity<List<BookingResponse>> getMyBookings(
            @PathVariable Long userId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("멘티 예약 목록 조회 API - userId: {}", userId);

        validateOwnership(principal, userId);

        List<BookingResponse> responses = bookingService.getMyBookings(userId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 멘토의 예약 목록 조회 (멘토 본인만 가능)
     * GET /api/mentoring-bookings/mentor/{mentorId}
     */
    @GetMapping("/mentor/{mentorId}")
    public ResponseEntity<List<BookingResponse>> getMentorBookings(
            @PathVariable Long mentorId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("멘토 예약 목록 조회 API - mentorId: {}, userId: {}", mentorId, principal.getUserId());

        // 멘토 본인 확인 (mentorId는 Mentor 엔티티 ID이므로 서비스에서 검증)
        bookingService.validateMentorAccess(mentorId, principal.getUserId());

        List<BookingResponse> responses = bookingService.getMentorBookings(mentorId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 예약 상세 조회 (예약 당사자만 가능)
     * GET /api/mentoring-bookings/{bookingId}
     */
    @GetMapping("/{bookingId}")
    public ResponseEntity<BookingResponse> getBookingDetail(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("예약 상세 조회 API - bookingId: {}, userId: {}", bookingId, principal.getUserId());

        // 예약 당사자(멘토 또는 멘티) 확인
        bookingService.validateBookingAccess(bookingId, principal.getUserId());

        BookingResponse response = bookingService.getBookingDetail(bookingId);
        return ResponseEntity.ok(response);
    }

    /**
     * 예약 확정 (멘토만 가능)
     * PATCH /api/mentoring-bookings/{bookingId}/confirm
     */
    @PatchMapping("/{bookingId}/confirm")
    public ResponseEntity<BookingResponse> confirmBooking(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("예약 확정 API - bookingId: {}, userId: {}", bookingId, principal.getUserId());

        // 멘토 권한 확인
        bookingService.validateMentorAccessByBooking(bookingId, principal.getUserId());

        BookingResponse response = bookingService.confirmBooking(bookingId);
        return ResponseEntity.ok(response);
    }

    /**
     * 예약 거절 (멘토만 가능)
     * PATCH /api/mentoring-bookings/{bookingId}/reject
     */
    @PatchMapping("/{bookingId}/reject")
    public ResponseEntity<BookingResponse> rejectBooking(
            @PathVariable Long bookingId,
            @RequestBody ConfirmRejectRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("예약 거절 API - bookingId: {}, userId: {}", bookingId, principal.getUserId());

        // 멘토 권한 확인
        bookingService.validateMentorAccessByBooking(bookingId, principal.getUserId());

        BookingResponse response = bookingService.rejectBooking(bookingId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 예약 취소 (멘티만 가능)
     * PATCH /api/mentoring-bookings/{bookingId}/cancel
     */
    @PatchMapping("/{bookingId}/cancel")
    public ResponseEntity<BookingResponse> cancelBooking(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("예약 취소 API - bookingId: {}, userId: {}", bookingId, principal.getUserId());

        // 멘티 권한 확인
        bookingService.validateMenteeAccessByBooking(bookingId, principal.getUserId());

        BookingResponse response = bookingService.cancelBooking(bookingId);
        return ResponseEntity.ok(response);
    }

    /**
     * 멘토링 완료 처리 (멘토만 가능)
     * PATCH /api/mentoring-bookings/{bookingId}/complete
     */
    @PatchMapping("/{bookingId}/complete")
    public ResponseEntity<BookingResponse> completeBooking(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("멘토링 완료 처리 API - bookingId: {}, userId: {}", bookingId, principal.getUserId());

        // 멘토 권한 확인
        bookingService.validateMentorAccessByBooking(bookingId, principal.getUserId());

        BookingResponse response = bookingService.completeBooking(bookingId);
        return ResponseEntity.ok(response);
    }

    /**
     * LiveKit 토큰 생성 (예약 당사자만 가능)
     * GET /api/mentoring-bookings/{bookingId}/token?userId={userId}
     */
    @GetMapping("/{bookingId}/token")
    public ResponseEntity<String> getLiveKitToken(
            @PathVariable Long bookingId,
            @RequestParam Long userId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("LiveKit 토큰 생성 API - bookingId: {}, userId: {}", bookingId, userId);

        validateOwnership(principal, userId);

        String token = bookingService.generateLiveKitToken(bookingId, userId);
        return ResponseEntity.ok(token);
    }

    /**
     * 본인 확인 헬퍼 메서드
     */
    private void validateOwnership(JwtUserPrincipal principal, Long userId) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        if (!principal.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "접근 권한이 없습니다.");
        }
    }
}
