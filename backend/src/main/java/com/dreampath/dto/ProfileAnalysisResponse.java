package com.dreampath.dto;

import com.dreampath.entity.ProfileAnalysis;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ProfileAnalysisResponse {

    private final Long analysisId;
    private final Long userId;
    private final String personality;
    private final String values;
    private final String emotions;
    private final String interests;
    private final Double confidenceScore;
    private final LocalDateTime createdAt;
    private final String mbti;

    public static ProfileAnalysisResponse from(ProfileAnalysis analysis) {
        return ProfileAnalysisResponse.builder()
                .analysisId(analysis.getAnalysisId())
                .userId(analysis.getUserId())
                .personality(analysis.getPersonality())
                .values(analysis.getValues())
                .emotions(analysis.getEmotions())
                .interests(analysis.getInterests())
                .confidenceScore(analysis.getConfidenceScore())
                .createdAt(analysis.getCreatedAt())
                .mbti(analysis.getMbti())
                .build();
    }
}
