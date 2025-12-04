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
import java.util.HashMap;
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
        List<AnalysisResponse.CareerRecommendation> recommendations = parseCareerRecommendations(analysis.getRecommendedCareers());
        
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
            return objectMapper.readValue(json, new TypeReference<List<AnalysisResponse.InterestArea>>() {});
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
            return objectMapper.readValue(json, new TypeReference<List<AnalysisResponse.CareerRecommendation>>() {});
        } catch (JsonProcessingException e) {
            log.error("추천 진로 JSON 파싱 실패", e);
            return new ArrayList<>();
        }
    }
    
    private String serializeToJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.error("JSON 직렬화 실패", e);
            return "{}";
        }
    }
}

