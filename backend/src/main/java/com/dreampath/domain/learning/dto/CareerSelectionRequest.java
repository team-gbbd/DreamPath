package com.dreampath.domain.learning.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 진로 분석 결과에서 직업 선택 후 학습 경로 생성 요청 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CareerSelectionRequest {

    /**
     * 사용자 ID
     */
    @NotNull(message = "사용자 ID는 필수입니다")
    private Long userId;

    /**
     * 진로 상담 세션 ID (선택적 - 테스트용으로 null 가능)
     */
    private String sessionId;

    /**
     * 선택한 직업명 (CareerRecommendation의 careerName)
     */
    @NotBlank(message = "직업명은 필수입니다")
    private String selectedCareer;
}
