package com.dreampath.domain.career.service;

import com.dreampath.domain.career.dto.AnalysisResponse;
import com.dreampath.domain.career.entity.CareerAnalysis;
import com.dreampath.domain.career.entity.CareerSession;
import com.dreampath.domain.career.repository.CareerAnalysisRepository;
import com.dreampath.domain.career.repository.CareerSessionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CareerAnalysisService {

    private final CareerSessionRepository sessionRepository;
    private final CareerAnalysisRepository analysisRepository;
    private final PythonAIService pythonAIService;
    private final com.dreampath.domain.profile.service.UserProfileSyncService userProfileSyncService;
    private final com.dreampath.domain.profile.repository.ProfileAnalysisRepository profileAnalysisRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public AnalysisResponse analyzeSession(String sessionId) {
        CareerSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));

        // 대화 내용을 Python AI 서비스 형식으로 변환
        List<Map<String, String>> conversationHistory = session.getMessages().stream()
                .map(msg -> {
                    Map<String, String> message = new HashMap<>();
                    message.put("role", msg.getRole().name());
                    message.put("content", msg.getContent());
                    return message;
                })
                .collect(Collectors.toList());

        // Python AI 서비스를 호출하여 분석 수행
        AnalysisResponse analysisResponse = pythonAIService.analyzeCareer(sessionId, conversationHistory);

        // 분석 결과 추출
        AnalysisResponse.EmotionAnalysis emotionAnalysis = analysisResponse.getEmotion();
        AnalysisResponse.PersonalityAnalysis personalityAnalysis = analysisResponse.getPersonality();
        AnalysisResponse.InterestAnalysis interestAnalysis = analysisResponse.getInterest();
        String comprehensiveAnalysis = analysisResponse.getComprehensiveAnalysis();
        List<AnalysisResponse.CareerRecommendation> recommendations = analysisResponse.getRecommendedCareers();

        // 기존 분석 결과가 있는지 확인
        Optional<CareerAnalysis> existingAnalysis = analysisRepository.findBySession(session);

        CareerAnalysis analysis;
        if (existingAnalysis.isPresent()) {
            // 기존 분석 업데이트
            log.info("기존 분석 결과 업데이트: sessionId={}", sessionId);
            analysis = existingAnalysis.get();
            analysis.setEmotionAnalysis(emotionAnalysis.getDescription());
            analysis.setEmotionScore(emotionAnalysis.getScore());
            analysis.setPersonalityAnalysis(personalityAnalysis.getDescription());
            analysis.setPersonalityType(personalityAnalysis.getType());
            analysis.setInterestAnalysis(interestAnalysis.getDescription());
            analysis.setInterestAreas(serializeToJson(interestAnalysis.getAreas()));
            analysis.setComprehensiveAnalysis(comprehensiveAnalysis);
            analysis.setRecommendedCareers(serializeToJson(recommendations));
        } else {
            // 새로운 분석 생성
            log.info("새로운 분석 결과 생성: sessionId={}", sessionId);
            analysis = CareerAnalysis.builder()
                    .session(session)
                    .emotionAnalysis(emotionAnalysis.getDescription())
                    .emotionScore(emotionAnalysis.getScore())
                    .personalityAnalysis(personalityAnalysis.getDescription())
                    .personalityType(personalityAnalysis.getType())
                    .interestAnalysis(interestAnalysis.getDescription())
                    .interestAreas(serializeToJson(interestAnalysis.getAreas()))
                    .comprehensiveAnalysis(comprehensiveAnalysis)
                    .recommendedCareers(serializeToJson(recommendations))
                    .build();
            session.setAnalysis(analysis);
        }

        analysisRepository.save(analysis);
        sessionRepository.save(session);

        // 🔄 자동 동기화: CareerAnalysis → ProfileAnalysis → UserProfile → Vector 재생성 → 채용추천
        // 계산
        try {
            if (session.getUserId() != null) {
                Long userId = Long.parseLong(session.getUserId());
                log.info("🔄 Triggering ProfileAnalysis and UserProfile sync for userId: {}", userId);

                // CareerAnalysis를 ProfileAnalysis 형식으로 변환 및 저장
                com.dreampath.domain.profile.entity.ProfileAnalysis profileAnalysis = convertToProfileAnalysis(
                        analysis, analysisResponse, userId);
                profileAnalysis = profileAnalysisRepository.save(profileAnalysis);
                log.info("✅ ProfileAnalysis saved: analysisId={}, userId={}",
                        profileAnalysis.getAnalysisId(), userId);

                // UserProfile 동기화
                userProfileSyncService.syncFromAnalysis(userId, profileAnalysis);
            } else {
                log.warn("⚠️ Session userId is null, skipping profile sync for sessionId: {}", sessionId);
            }
        } catch (NumberFormatException e) {
            log.error("❌ Invalid userId format: {}", session.getUserId(), e);
        } catch (Exception e) {
            log.error("❌ Profile sync failed for sessionId: {}", sessionId, e);
            // 동기화 실패해도 분석 결과는 유지
        }

        return analysisResponse;
    }

    /**
     * 세션의 분석 결과를 조회합니다.
     * 
     * @param sessionId 세션 ID
     * @return 분석 결과 DTO
     * @throws RuntimeException 분석 결과가 없을 경우
     */
    @Transactional(readOnly = true)
    public AnalysisResponse getAnalysis(String sessionId) {
        log.info("분석 결과 조회 요청: sessionId={}", sessionId);

        CareerAnalysis analysis = analysisRepository.findBySession_SessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("분석 결과를 찾을 수 없습니다."));

        return convertToResponse(analysis);
    }

    /**
     * CareerAnalysis 엔티티를 AnalysisResponse DTO로 변환합니다.
     */
    private AnalysisResponse convertToResponse(CareerAnalysis analysis) {
        // 감정 분석
        AnalysisResponse.EmotionAnalysis emotion = AnalysisResponse.EmotionAnalysis.builder()
                .description(analysis.getEmotionAnalysis())
                .score(analysis.getEmotionScore())
                .emotionalState(determineEmotionalState(analysis.getEmotionScore()))
                .build();

        // 성향 분석
        AnalysisResponse.PersonalityAnalysis personality = AnalysisResponse.PersonalityAnalysis.builder()
                .description(analysis.getPersonalityAnalysis())
                .type(analysis.getPersonalityType())
                .strengths(new ArrayList<>()) // 필요시 추가 파싱
                .growthAreas(new ArrayList<>()) // 필요시 추가 파싱
                .build();

        // 흥미 분석
        List<AnalysisResponse.InterestArea> interestAreas = parseInterestAreas(analysis.getInterestAreas());
        AnalysisResponse.InterestAnalysis interest = AnalysisResponse.InterestAnalysis.builder()
                .description(analysis.getInterestAnalysis())
                .areas(interestAreas)
                .build();

        // 추천 진로
        List<AnalysisResponse.CareerRecommendation> recommendations = parseCareerRecommendations(
                analysis.getRecommendedCareers());

        return AnalysisResponse.builder()
                .sessionId(analysis.getSession().getSessionId())
                .emotion(emotion)
                .personality(personality)
                .interest(interest)
                .comprehensiveAnalysis(analysis.getComprehensiveAnalysis())
                .recommendedCareers(recommendations)
                .build();
    }

    /**
     * 감정 점수에 따라 감정 상태를 결정합니다.
     */
    private String determineEmotionalState(Integer score) {
        if (score == null) {
            return "중립적";
        }
        if (score >= 70) {
            return "긍정적";
        } else if (score >= 40) {
            return "중립적";
        } else {
            return "부정적";
        }
    }

    /**
     * JSON 문자열을 InterestArea 리스트로 파싱합니다.
     */
    private List<AnalysisResponse.InterestArea> parseInterestAreas(String json) {
        if (json == null || json.trim().isEmpty() || json.equals("{}")) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<AnalysisResponse.InterestArea>>() {
            });
        } catch (JsonProcessingException e) {
            log.error("흥미 분야 JSON 파싱 실패", e);
            return new ArrayList<>();
        }
    }

    /**
     * JSON 문자열을 CareerRecommendation 리스트로 파싱합니다.
     */
    private List<AnalysisResponse.CareerRecommendation> parseCareerRecommendations(String json) {
        if (json == null || json.trim().isEmpty() || json.equals("{}")) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<AnalysisResponse.CareerRecommendation>>() {
            });
        } catch (JsonProcessingException e) {
            log.error("추천 진로 JSON 파싱 실패", e);
            return new ArrayList<>();
        }
    }

    /**
     * CareerAnalysis를 ProfileAnalysis로 변환하고 DB에 저장합니다.
     * 기존 ProfileAnalysis가 있으면 업데이트하고, 없으면 새로 생성합니다.
     */
    private com.dreampath.domain.profile.entity.ProfileAnalysis convertToProfileAnalysis(
            CareerAnalysis careerAnalysis, AnalysisResponse analysisResponse, Long userId) {

        // 기존 ProfileAnalysis 조회 또는 새로 생성
        com.dreampath.domain.profile.entity.ProfileAnalysis profileAnalysis = profileAnalysisRepository
                .findByUserId(userId)
                .orElseGet(() -> com.dreampath.domain.profile.entity.ProfileAnalysis.builder()
                        .userId(userId)
                        .build());

        // CareerAnalysis의 데이터를 ProfileAnalysis 형식으로 매핑
        profileAnalysis.setPersonality(buildPersonalityJson(analysisResponse, careerAnalysis));
        profileAnalysis.setValues(buildValuesJson(analysisResponse, careerAnalysis));
        profileAnalysis.setEmotions(buildEmotionJson(analysisResponse, careerAnalysis));
        profileAnalysis.setInterests(buildInterestJson(analysisResponse, careerAnalysis));

        // MBTI 설정
        if (analysisResponse != null && analysisResponse.getPersonality() != null
                && analysisResponse.getPersonality().getType() != null) {
            profileAnalysis.setMbti(analysisResponse.getPersonality().getType());
        } else if (careerAnalysis.getPersonalityType() != null) {
            profileAnalysis.setMbti(careerAnalysis.getPersonalityType());
        }

        // Confidence Score 설정 (기본값 0.8)
        if (profileAnalysis.getConfidenceScore() == null) {
            Double confidence = careerAnalysis.getEmotionScore() != null
                    ? Math.min(Math.max(careerAnalysis.getEmotionScore() / 100.0, 0.0), 1.0)
                    : 0.8;
            profileAnalysis.setConfidenceScore(confidence);
        }

        return profileAnalysis;
    }

    private String serializeToJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.error("JSON 직렬화 실패", e);
            return "{}";
        }
    }

    private String buildPersonalityJson(AnalysisResponse analysisResponse, CareerAnalysis careerAnalysis) {
        Map<String, Object> payload = new LinkedHashMap<>();
        AnalysisResponse.PersonalityAnalysis personality = analysisResponse != null
                ? analysisResponse.getPersonality()
                : null;

        payload.put("description", personality != null && personality.getDescription() != null
                ? personality.getDescription()
                : careerAnalysis.getPersonalityAnalysis());
        payload.put("type", personality != null ? personality.getType() : careerAnalysis.getPersonalityType());
        payload.put("strengths", personality != null && personality.getStrengths() != null
                ? personality.getStrengths()
                : Collections.emptyList());
        payload.put("growthAreas", personality != null && personality.getGrowthAreas() != null
                ? personality.getGrowthAreas()
                : Collections.emptyList());
        payload.put("big_five", personality != null && personality.getBig_five() != null
                ? personality.getBig_five()
                : Collections.emptyMap());

        return serializeToJson(payload);
    }

    private String buildValuesJson(AnalysisResponse analysisResponse, CareerAnalysis careerAnalysis) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("summary", analysisResponse != null && analysisResponse.getComprehensiveAnalysis() != null
                ? analysisResponse.getComprehensiveAnalysis()
                : careerAnalysis.getComprehensiveAnalysis());

        AnalysisResponse.PersonalityAnalysis personality = analysisResponse != null
                ? analysisResponse.getPersonality()
                : null;
        payload.put("highlights", personality != null && personality.getStrengths() != null
                ? personality.getStrengths()
                : Collections.emptyList());
        payload.put("growthAreas", personality != null && personality.getGrowthAreas() != null
                ? personality.getGrowthAreas()
                : Collections.emptyList());
        payload.put("scores", Collections.emptyMap());
        return serializeToJson(payload);
    }

    private String buildEmotionJson(AnalysisResponse analysisResponse, CareerAnalysis careerAnalysis) {
        Map<String, Object> payload = new LinkedHashMap<>();
        AnalysisResponse.EmotionAnalysis emotion = analysisResponse != null ? analysisResponse.getEmotion() : null;
        payload.put("description", emotion != null && emotion.getDescription() != null
                ? emotion.getDescription()
                : careerAnalysis.getEmotionAnalysis());
        payload.put("score", emotion != null && emotion.getScore() != null
                ? emotion.getScore()
                : careerAnalysis.getEmotionScore());
        payload.put("emotionalState", emotion != null && emotion.getEmotionalState() != null
                ? emotion.getEmotionalState()
                : "중립적");
        return serializeToJson(payload);
    }

    private String buildInterestJson(AnalysisResponse analysisResponse, CareerAnalysis careerAnalysis) {
        Map<String, Object> payload = new LinkedHashMap<>();
        AnalysisResponse.InterestAnalysis interest = analysisResponse != null ? analysisResponse.getInterest() : null;
        payload.put("description", interest != null && interest.getDescription() != null
                ? interest.getDescription()
                : careerAnalysis.getInterestAnalysis());

        List<AnalysisResponse.InterestArea> areas = interest != null && interest.getAreas() != null
                ? interest.getAreas()
                : parseInterestAreas(careerAnalysis.getInterestAreas());
        payload.put("areas", areas);
        return serializeToJson(payload);
    }
}
