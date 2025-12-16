package com.dreampath.domain.profile.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;
import com.dreampath.domain.profile.entity.ProfileAnalysis;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class ProfileAnalysisResponse {

    private final Long analysisId;
    private final Long userId;

    @JsonRawValue
    private final String personality;

    @JsonRawValue
    private final String values;

    @JsonRawValue
    private final String emotions;

    @JsonRawValue
    private final String interests;

    private final Double confidenceScore;
    private final LocalDateTime createdAt;
    private final String mbti;
    private final String summary;
    private final List<String> strengths;
    private final List<String> risks;
    private final List<String> goals;
    private final List<String> valuesList;

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
                .summary(analysis.getSummary())
                .strengths(analysis.getStrengths())
                .risks(analysis.getRisks())
                .goals(analysis.getGoals())
                .valuesList(analysis.getValuesList())
                .build();
    }
}
