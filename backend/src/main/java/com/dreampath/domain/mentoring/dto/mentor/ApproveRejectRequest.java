package com.dreampath.domain.mentoring.dto.mentor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 멘토 승인/거절 요청 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveRejectRequest {

    @NotNull(message = "승인 여부는 필수입니다")
    private Boolean approve; // true: 승인, false: 거절

    private String reason; // 거절 사유 (거절 시 필수)
}
