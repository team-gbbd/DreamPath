package com.dreampath.domain.agent.recommendation.dto;

import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class RecommendationAgentResponse {
    private List<Map<String, Object>> jobs;
    private List<Map<String, Object>> majors;
    private Explanations explanations;

    @Data
    public static class Explanations {
        private List<String> jobs;
        private List<String> majors;
    }
}
