package com.dreampath.domain.career.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisResponse {

    // 세션 ID
    private String sessionId;

    // 감정 분석
    private EmotionAnalysis emotion;

    // 성향 분석
    private PersonalityAnalysis personality;

    // 흥미 분석
    private InterestAnalysis interest;

    // 종합 분석
    private String comprehensiveAnalysis;

    // 추천 진로
    private List<CareerRecommendation> recommendedCareers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmotionAnalysis {
        private String description;
        private Integer score; // 1-100
        private String emotionalState; // 긍정적, 중립적, 부정적 등
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PersonalityAnalysis {
        private String description;
        private String type; // MBTI, 성격 유형 등
        private java.util.Map<String, Object> big_five;
        private List<String> strengths;
        private List<String> growthAreas;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InterestAnalysis {
        private String description;
        private List<InterestArea> areas;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InterestArea {
        private String name;
        private Integer level; // 1-10
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CareerRecommendation {
        private String careerName;
        private String description;
        private Integer matchScore; // 1-100
        private List<String> reasons;
    }
}
