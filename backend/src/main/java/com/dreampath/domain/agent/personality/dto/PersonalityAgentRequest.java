package com.dreampath.domain.agent.personality.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalityAgentRequest {

    private String sessionId;
    private List<Map<String, Object>> conversationHistory;
    private Map<String, Object> userProfile;
    private Map<String, Object> surveyData;
    private Map<String, Object> metadata;

    public Map<String, Object> toPythonPayload() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("session_id", sessionId);
        payload.put("conversation_history", conversationHistory != null ? conversationHistory : new ArrayList<>());
        payload.put("user_profile", userProfile != null ? userProfile : new HashMap<>());
        payload.put("survey_data", surveyData != null ? surveyData : new HashMap<>());
        if (metadata != null && !metadata.isEmpty()) {
            payload.put("metadata", metadata);
        }
        return payload;
    }
}
