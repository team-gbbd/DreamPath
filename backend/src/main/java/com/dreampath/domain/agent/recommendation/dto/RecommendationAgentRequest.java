package com.dreampath.domain.agent.recommendation.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class RecommendationAgentRequest {
    // Cache key fields (optional for backward compatibility)
    private Long userId;
    private LocalDateTime profileUpdatedAt;

    // Profile data fields
    private String summary;
    private List<String> goals;
    private List<String> values;
    private Map<String, Double> personality;
    private List<String> strengths;
    private List<String> risks;
}
