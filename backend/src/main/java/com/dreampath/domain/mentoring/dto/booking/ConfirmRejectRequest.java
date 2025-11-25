package com.dreampath.domain.mentoring.dto.booking;

import lombok.Data;

/**
 * 예약 확정/거절 요청 DTO
 */
@Data
public class ConfirmRejectRequest {

    private String reason; // 거절 사유 (거절 시 필수)
}
