package com.dreampath.domain.career.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 실시간 정체성 상태 DTO
 * 
 * 대화 중 지속적으로 업데이트되는 학생의 진로 정체성 정보
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IdentityStatus {
    
    /**
     * 세션 ID
     */
    private String sessionId;
    
    /**
     * 현재 대화 단계
     */
    private String currentStage;
    
    /**
     * 단계 설명
     */
    private String stageDescription;
    
    /**
     * 전체 진행률 (0-100%)
     */
    private Integer overallProgress;
    
    /**
     * 정체성 명확도 (0-100)
     */
    private Integer clarity;
    
    /**
     * 명확도 설명
     */
    private String clarityReason;
    
    /**
     * 핵심 정체성 (확립되면 표시)
     */
    private String identityCore;
    
    /**
     * 정체성 확신도 (0-100)
     */
    private Integer confidence;
    
    /**
     * 발견된 특징들
     */
    private List<IdentityTrait> traits;
    
    /**
     * 인사이트 (대화 중 발견한 것들)
     */
    private List<String> insights;
    
    /**
     * 다음 탐색 영역
     */
    private String nextFocus;
    
    /**
     * 최근 인사이트 (방금 발견한 것)
     */
    private RecentInsight recentInsight;
    
    /**
     * 정체성 특징
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IdentityTrait {
        private String category;  // 성향, 가치관, 흥미, 재능
        private String trait;
        private String evidence;
    }
    
    /**
     * 최근 인사이트
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentInsight {
        private Boolean hasInsight;
        private String insight;
        private String type;
    }
}

