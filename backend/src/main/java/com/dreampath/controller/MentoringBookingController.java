package com.dreampath.controller;

import com.dreampath.dto.booking.BookingRequest;
import com.dreampath.dto.booking.BookingResponse;
import com.dreampath.dto.booking.ConfirmRejectRequest;
import com.dreampath.service.MentoringBookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/mentoring-bookings")
@RequiredArgsConstructor
public class MentoringBookingController {

    private final MentoringBookingService bookingService;

    /**
     * 멘토링 예약 생성
     * POST /api/mentoring-bookings
     */
    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(@Valid @RequestBody BookingRequest request) {
        log.info("멘토링 예약 생성 API - sessionId: {}, menteeId: {}", request.getSessionId(), request.getMenteeId());

        BookingResponse response = bookingService.createBooking(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 내 예약 목록 조회 (멘티)
     * GET /api/mentoring-bookings/mentee/{userId}
     */
    @GetMapping("/mentee/{userId}")
    public ResponseEntity<List<BookingResponse>> getMyBookings(@PathVariable Long userId) {
        log.info("멘티 예약 목록 조회 API - userId: {}", userId);

        List<BookingResponse> responses = bookingService.getMyBookings(userId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 멘토의 예약 목록 조회
     * GET /api/mentoring-bookings/mentor/{mentorId}
     */
    @GetMapping("/mentor/{mentorId}")
    public ResponseEntity<List<BookingResponse>> getMentorBookings(@PathVariable Long mentorId) {
        log.info("멘토 예약 목록 조회 API - mentorId: {}", mentorId);

        List<BookingResponse> responses = bookingService.getMentorBookings(mentorId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 예약 상세 조회
     * GET /api/mentoring-bookings/{bookingId}
     */
    @GetMapping("/{bookingId}")
    public ResponseEntity<BookingResponse> getBookingDetail(@PathVariable Long bookingId) {
        log.info("예약 상세 조회 API - bookingId: {}", bookingId);

        BookingResponse response = bookingService.getBookingDetail(bookingId);
        return ResponseEntity.ok(response);
    }

    /**
     * 예약 확정 (멘토)
     * PATCH /api/mentoring-bookings/{bookingId}/confirm
     */
    @PatchMapping("/{bookingId}/confirm")
    public ResponseEntity<BookingResponse> confirmBooking(@PathVariable Long bookingId) {
        log.info("예약 확정 API - bookingId: {}", bookingId);

        BookingResponse response = bookingService.confirmBooking(bookingId);
        return ResponseEntity.ok(response);
    }

    /**
     * 예약 거절 (멘토)
     * PATCH /api/mentoring-bookings/{bookingId}/reject
     */
    @PatchMapping("/{bookingId}/reject")
    public ResponseEntity<BookingResponse> rejectBooking(
            @PathVariable Long bookingId,
            @RequestBody ConfirmRejectRequest request) {
        log.info("예약 거절 API - bookingId: {}", bookingId);

        BookingResponse response = bookingService.rejectBooking(bookingId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 예약 취소 (멘티)
     * PATCH /api/mentoring-bookings/{bookingId}/cancel
     */
    @PatchMapping("/{bookingId}/cancel")
    public ResponseEntity<BookingResponse> cancelBooking(@PathVariable Long bookingId) {
        log.info("예약 취소 API - bookingId: {}", bookingId);

        BookingResponse response = bookingService.cancelBooking(bookingId);
        return ResponseEntity.ok(response);
    }

    /**
     * 멘토링 완료 처리
     * PATCH /api/mentoring-bookings/{bookingId}/complete
     */
    @PatchMapping("/{bookingId}/complete")
    public ResponseEntity<BookingResponse> completeBooking(@PathVariable Long bookingId) {
        log.info("멘토링 완료 처리 API - bookingId: {}", bookingId);

        BookingResponse response = bookingService.completeBooking(bookingId);
        return ResponseEntity.ok(response);
    }

    /**
     * LiveKit 토큰 생성
     * GET /api/mentoring-bookings/{bookingId}/token?userId={userId}
     */
    @GetMapping("/{bookingId}/token")
    public ResponseEntity<String> getLiveKitToken(
            @PathVariable Long bookingId,
            @RequestParam Long userId) {
        log.info("LiveKit 토큰 생성 API - bookingId: {}, userId: {}", bookingId, userId);

        String token = bookingService.generateLiveKitToken(bookingId, userId);
        return ResponseEntity.ok(token);
    }
}
