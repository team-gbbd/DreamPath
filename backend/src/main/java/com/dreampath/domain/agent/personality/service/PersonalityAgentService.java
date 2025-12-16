package com.dreampath.domain.agent.personality.service;

import com.dreampath.domain.agent.personality.dto.PersonalityAgentRequest;
import com.dreampath.domain.agent.personality.dto.PersonalityAgentResponse;
import com.dreampath.domain.agent.service.PythonAgentService;
import com.dreampath.domain.career.entity.CareerSession;
import com.dreampath.domain.career.entity.ChatMessage;
import com.dreampath.domain.career.repository.CareerSessionRepository;
import com.dreampath.domain.profile.entity.ProfileAnalysis;
import com.dreampath.domain.profile.entity.ProfileVector;
import com.dreampath.domain.profile.entity.UserProfile;
import com.dreampath.domain.profile.repository.ProfileAnalysisRepository;
import com.dreampath.domain.profile.repository.ProfileVectorRepository;
import com.dreampath.domain.profile.repository.UserProfileRepository;
import com.dreampath.domain.profile.service.UserProfileSyncService;
import com.dreampath.domain.agent.recommendation.service.RecommendationCacheService;
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
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class PersonalityAgentService {

    private final CareerSessionRepository careerSessionRepository;
    private final UserProfileRepository userProfileRepository;
    private final ProfileAnalysisRepository profileAnalysisRepository;
    private final ProfileVectorRepository profileVectorRepository;
    private final PythonAgentService pythonAgentService;
    private final ObjectMapper objectMapper;
    private final UserProfileSyncService userProfileSyncService;
    private final RecommendationCacheService recommendationCacheService;

    @Transactional(readOnly = true)
    public PersonalityAgentResponse run(PersonalityAgentRequest incomingRequest) {
        if (incomingRequest.getSessionId() == null || incomingRequest.getSessionId().isBlank()) {
            throw new IllegalArgumentException("sessionId는 필수입니다.");
        }

        String sessionId = incomingRequest.getSessionId();
        // findBySessionIdWithMessages로 메시지를 함께 조회 (REQUIRES_NEW 트랜잭션에서 lazy loading 문제 방지)
        CareerSession session = careerSessionRepository.findBySessionIdWithMessages(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("세션을 찾을 수 없습니다."));

        log.info("PersonalityAgent 세션 조회 완료 - sessionId: {}, 메시지 수: {}",
                sessionId, session.getMessages() != null ? session.getMessages().size() : 0);

        List<Map<String, Object>> history = resolveConversationHistory(
                incomingRequest.getConversationHistory(),
                session);
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

        // 비동기로 프로필 저장 및 추천 생성 (응답 지연 방지)
        String userIdForAsync = session.getUserId();
        CompletableFuture.runAsync(() -> {
            try {
                persistAnalysis(userIdForAsync, pythonResponse);
            } catch (Exception e) {
                log.error("❌ 비동기 프로필 저장 실패. userId: {}", userIdForAsync, e);
            }
        });

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
            CareerSession session) {
        if (providedHistory != null && !providedHistory.isEmpty()) {
            return providedHistory;
        }

        List<ChatMessage> messages = session.getMessages();
        if (messages == null || messages.isEmpty()) {
            return List.of();
        }

        List<Map<String, Object>> history = new ArrayList<>();
        messages.stream()
                .sorted((m1, m2) -> m1.getTimestamp().compareTo(m2.getTimestamp()))
                .forEach(message -> {
                    Map<String, Object> entry = new HashMap<>();
                    entry.put("role", convertRole(message.getRole()));
                    entry.put("content", message.getContent());
                    history.add(entry);
                });
        return history;
    }

    private String convertRole(ChatMessage.MessageRole role) {
        return switch (role) {
            case ASSISTANT -> "assistant";
            case SYSTEM -> "system";
            default -> "user";
        };
    }

    private Map<String, Object> resolveSurveyData(Map<String, Object> provided, CareerSession session) {
        if (provided != null && !provided.isEmpty()) {
            return provided;
        }
        return new HashMap<>();
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

    @Transactional
    public void persistAnalysis(String userIdRaw, Map<String, Object> pythonResponse) {
        Optional<Long> userId = parseUserId(userIdRaw);
        if (userId.isEmpty()) {
            return;
        }

        // 1. ProfileAnalysis 저장
        ProfileAnalysis analysis = profileAnalysisRepository.findByUserId(userId.get())
                .orElseGet(() -> ProfileAnalysis.builder().userId(userId.get()).build());

        analysis.setSummary((String) pythonResponse.get("summary"));

        Map<String, Object> personality = new HashMap<>();
        personality.put("bigFive", pythonResponse.get("big_five"));
        analysis.setPersonality(writeJson(personality));

        analysis.setStrengths(castToList(pythonResponse.get("strengths")));
        analysis.setRisks(castToList(pythonResponse.get("risks")));
        analysis.setGoals(castToList(pythonResponse.get("goals")));
        analysis.setValuesList(castToList(pythonResponse.get("values")));
        analysis.setMbti((String) pythonResponse.get("mbti"));

        profileAnalysisRepository.save(analysis);
        log.info("✅ ProfileAnalysis 저장 완료. userId: {}", userId.get());

        // 2. UserProfile 동기화
        try {
            UserProfile updatedProfile = userProfileSyncService.syncFromAnalysis(userId.get(), analysis);
            log.info("✅ UserProfile 동기화 완료. profileId: {}", updatedProfile.getProfileId());

            // 3. 벡터 재생성과 추천 저장을 병렬로 실행
            Long userIdValue = userId.get();
            Long profileId = updatedProfile.getProfileId();

            CompletableFuture<Void> recommendationFuture = CompletableFuture.runAsync(() -> {
                try {
                    saveRecommendations(userIdValue, profileId);
                } catch (Exception e) {
                    log.error("❌ 추천 저장 실패. userId: {}", userIdValue, e);
                }
            });

            // 추천 저장 완료 대기 (벡터는 syncFromAnalysis에서 이미 처리됨)
            recommendationFuture.join();
        } catch (Exception e) {
            log.error("❌ UserProfile 동기화 실패. userId: {}", userId.get(), e);
        }
    }

    /**
     * 직업/학과 추천 캐시를 무효화합니다.
     * 새로운 분석 결과가 저장되었으므로, 다음 추천 조회 시 새로운 추천이 생성되도록 합니다.
     */
    private void saveRecommendations(Long userId, Long profileId) {
        try {
            // 캐시 무효화 (기존 추천 삭제)
            recommendationCacheService.invalidateCache(userId);
            log.info("✅ 추천 캐시 무효화 완료. userId: {}", userId);

            // TODO: 필요 시 여기서 비동기로 RecommendationAgentService를 호출하여 미리 생성할 수 있음.
            // 현재는 사용자가 대시보드에 접속할 때(On-Demand) 생성하도록 함.
        } catch (Exception e) {
            log.error("❌ 추천 캐시 무효화 중 오류 발생. userId: {}", userId, e);
        }
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
