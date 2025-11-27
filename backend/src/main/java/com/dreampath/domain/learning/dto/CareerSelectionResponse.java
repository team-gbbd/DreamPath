package com.dreampath.domain.learning.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 직업 선택 후 학습 경로 생성 결과 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CareerSelectionResponse {

    /**
     * 생성된 학습 경로 ID
     */
    private Long learningPathId;

    /**
     * 선택한 직업명
     */
    private String selectedCareer;

    /**
     * 매핑된 학습 도메인
     */
    private String learningDomain;

    /**
     * 생성된 주차 세션 수
     */
    private Integer totalWeeks;

    /**
     * 메시지
     */
    private String message;
}
