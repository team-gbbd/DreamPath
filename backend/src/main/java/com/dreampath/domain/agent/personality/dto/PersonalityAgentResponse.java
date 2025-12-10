package com.dreampath.domain.agent.personality.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalityAgentResponse {

    private String sessionId;
    private String summary;
    private Map<String, Object> bigFive;
    private String mbti;
    private List<String> strengths;
    private List<String> risks;
    private String embeddingDocument;
    private Map<String, Object> metadata;
}
