package com.dreampath.domain.payment.dto;

import com.dreampath.domain.payment.entity.SessionUsageLog;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 세션 사용 내역 응답 DTO
 */
@Data
@Builder
public class SessionUsageResponse {
    private Long logId;
    private Long userId;
    private Long bookingId;
    private int sessionsBefore;
    private int sessionsAfter;
    private String changeType;
    private String description;
    private LocalDateTime createdAt;

    public static SessionUsageResponse from(SessionUsageLog log) {
        return SessionUsageResponse.builder()
                .logId(log.getLogId())
                .userId(log.getUser().getUserId())
                .bookingId(log.getBooking() != null ? log.getBooking().getBookingId() : null)
                .sessionsBefore(log.getSessionsBefore())
                .sessionsAfter(log.getSessionsAfter())
                .changeType(log.getChangeType())
                .description(log.getDescription())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
