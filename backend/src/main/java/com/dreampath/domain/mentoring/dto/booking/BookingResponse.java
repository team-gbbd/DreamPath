package com.dreampath.domain.mentoring.dto.booking;

import com.dreampath.domain.mentoring.entity.MentoringBooking;
import com.dreampath.global.enums.BookingStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 멘토링 예약 응답 DTO
 */
@Data
@Builder
public class BookingResponse {

    private Long bookingId;
    private Long sessionId;
    private String sessionTitle;
    private Long mentorId;
    private String mentorName;
    private String mentorUsername;
    private Long menteeId;
    private String menteeName;
    private String menteeUsername;
    private String bookingDate;
    private String timeSlot;
    private String message;
    private BookingStatus status;
    private String rejectionReason;
    private String meetingUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static BookingResponse from(MentoringBooking booking) {
        return BookingResponse.builder()
                .bookingId(booking.getBookingId())
                .sessionId(booking.getSession().getSessionId())
                .sessionTitle(booking.getSession().getTitle())
                .mentorId(booking.getSession().getMentor().getMentorId())
                .mentorName(booking.getSession().getMentor().getUser().getName())
                .mentorUsername(booking.getSession().getMentor().getUser().getUsername())
                .menteeId(booking.getMentee().getUserId())
                .menteeName(booking.getMentee().getName())
                .menteeUsername(booking.getMentee().getUsername())
                .bookingDate(booking.getBookingDate())
                .timeSlot(booking.getTimeSlot())
                .message(booking.getMessage())
                .status(booking.getStatus())
                .rejectionReason(booking.getRejectionReason())
                .meetingUrl(booking.getMeetingUrl())
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .build();
    }
}
