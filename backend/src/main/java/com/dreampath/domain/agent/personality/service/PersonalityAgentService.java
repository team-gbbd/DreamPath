package com.dreampath.domain.agent.personality.service;

import com.dreampath.domain.agent.personality.dto.PersonalityAgentRequest;
import com.dreampath.domain.agent.personality.dto.PersonalityAgentResponse;
import com.dreampath.domain.agent.service.PythonAgentService;
import com.dreampath.domain.career.entity.CareerSession;
import com.dreampath.domain.career.repository.CareerSessionRepository;
import com.dreampath.domain.career.service.CareerChatService;
import com.dreampath.domain.profile.entity.ProfileAnalysis;
import com.dreampath.domain.profile.entity.UserProfile;
import com.dreampath.domain.profile.repository.ProfileAnalysisRepository;
import com.dreampath.domain.profile.repository.UserProfileRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PersonalityAgentService {

    private final CareerChatService careerChatService;
    private final CareerSessionRepository careerSessionRepository;
    private final UserProfileRepository userProfileRepository;
    private final ProfileAnalysisRepository profileAnalysisRepository;
    private final PythonAgentService pythonAgentService;
    private final ObjectMapper objectMapper;

    @Transactional
    public PersonalityAgentResponse run(PersonalityAgentRequest incomingRequest) {
        if (incomingRequest.getSessionId() == null || incomingRequest.getSessionId().isBlank()) {
            throw new IllegalArgumentException("sessionId는 필수입니다.");
        }

        String sessionId = incomingRequest.getSessionId();
        CareerSession session = careerSessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("세션을 찾을 수 없습니다."));

        List<Map<String, Object>> history = resolveConversationHistory(
                incomingRequest.getConversationHistory(),
                sessionId
        );
        Map<String, Object> surveyData = resolveSurveyData(incomingRequest.getSurveyData(), session);
        Map<String, Object> userProfile = resolveUserProfile(incomingRequest.getUserProfile(), session.getUserId());

        PersonalityAgentRequest payload = PersonalityAgentRequest.builder()
                .sessionId(sessionId)
                .conversationHistory(history)
                .surveyData(surveyData)
                .userProfile(userProfile)
                .metadata(incomingRequest.getMetadata())
                .build();

        Map<String, Object> pythonResponse = pythonAgentService.callPersonalityAgent(payload.toPythonPayload());
        persistAnalysis(session.getUserId(), pythonResponse);

        return PersonalityAgentResponse.builder()
                .sessionId(sessionId)
                .summary((String) pythonResponse.getOrDefault("summary", ""))
                .bigFive(castToMap(pythonResponse.get("big_five")))
                .mbti((String) pythonResponse.getOrDefault("mbti", ""))
                .strengths(castToList(pythonResponse.get("strengths")))
                .risks(castToList(pythonResponse.get("risks")))
                .embeddingDocument((String) pythonResponse.getOrDefault("embedding_document", ""))
                .metadata(incomingRequest.getMetadata())
                .build();
    }

    private List<Map<String, Object>> resolveConversationHistory(
            List<Map<String, Object>> providedHistory,
            String sessionId
    ) {
        if (providedHistory != null && !providedHistory.isEmpty()) {
            return providedHistory;
        }

        String historyText = careerChatService.getConversationHistory(sessionId);
        if (historyText == null || historyText.isBlank()) {
            return List.of();
        }

        List<Map<String, Object>> history = new ArrayList<>();
        String[] entries = historyText.split("\\n\\n+");
        for (String entry : entries) {
            String trimmed = entry.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            String role = trimmed.startsWith("상담사") ? "assistant" : "user";
            int separator = trimmed.indexOf(":");
            String content = separator >= 0 ? trimmed.substring(separator + 1).trim() : trimmed;
            Map<String, Object> message = new HashMap<>();
            message.put("role", role);
            message.put("content", content);
            history.add(message);
        }
        return history;
    }

    private Map<String, Object> resolveSurveyData(Map<String, Object> provided, CareerSession session) {
        if (provided != null && !provided.isEmpty()) {
            return provided;
        }
        if (session.getSurveyData() == null || session.getSurveyData().isBlank()) {
            return new HashMap<>();
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = objectMapper.readValue(session.getSurveyData(), Map.class);
            return parsed;
        } catch (Exception e) {
            log.warn("설문 데이터 파싱 실패: {}", e.getMessage());
            return new HashMap<>();
        }
    }

    private Map<String, Object> resolveUserProfile(Map<String, Object> provided, String userIdRaw) {
        if (provided != null && !provided.isEmpty()) {
            return provided;
        }

        Optional<Long> userId = parseUserId(userIdRaw);
        if (userId.isEmpty()) {
            return new HashMap<>();
        }

        return userProfileRepository.findByUserId(userId.get())
                .map(this::toProfileMap)
                .orElseGet(HashMap::new);
    }

    private Optional<Long> parseUserId(String userIdRaw) {
        if (userIdRaw == null || userIdRaw.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(Long.parseLong(userIdRaw));
        } catch (NumberFormatException ex) {
            log.warn("userId 파싱 실패: {}", userIdRaw);
            return Optional.empty();
        }
    }

    private Map<String, Object> toProfileMap(UserProfile profile) {
        Map<String, Object> map = new HashMap<>();
        map.put("personality", profile.getPersonality());
        map.put("values", profile.getValues());
        map.put("emotions", profile.getEmotions());
        map.put("interests", profile.getInterests());
        map.put("metadata", profile.getMetadata());
        return map;
    }

    private void persistAnalysis(String userIdRaw, Map<String, Object> pythonResponse) {
        Optional<Long> userId = parseUserId(userIdRaw);
        if (userId.isEmpty()) {
            return;
        }
        ProfileAnalysis analysis = profileAnalysisRepository.findByUserId(userId.get())
                .orElseGet(() -> ProfileAnalysis.builder().userId(userId.get()).build());

        Map<String, Object> personality = new HashMap<>();
        personality.put("summary", pythonResponse.get("summary"));
        personality.put("bigFive", pythonResponse.get("big_five"));
        analysis.setPersonality(writeJson(personality));

        Map<String, Object> strengthsAndRisks = new HashMap<>();
        strengthsAndRisks.put("strengths", pythonResponse.get("strengths"));
        strengthsAndRisks.put("risks", pythonResponse.get("risks"));
        analysis.setValues(writeJson(strengthsAndRisks));
        analysis.setMbti((String) pythonResponse.get("mbti"));

        profileAnalysisRepository.save(analysis);
    }

    private String writeJson(Object payload) {
        if (payload == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            log.warn("JSON 직렬화 실패: {}", e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castToMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return new HashMap<>();
    }

    @SuppressWarnings("unchecked")
    private List<String> castToList(Object value) {
        if (value instanceof List<?> list) {
            List<String> result = new ArrayList<>();
            for (Object item : list) {
                if (item != null) {
                    result.add(String.valueOf(item));
                }
            }
            return result;
        }
        return List.of();
    }
}
