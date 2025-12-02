package com.dreampath.domain.mentoring.dto.booking;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 멘토링 예약 요청 DTO
 */
@Data
public class BookingRequest {

    @NotNull(message = "세션 ID는 필수입니다.")
    private Long sessionId;

    @NotNull(message = "멘티 ID는 필수입니다.")
    private Long menteeId;

    private String message; // 멘티 메시지 (선택)
}
