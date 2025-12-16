package com.dreampath.domain.career.service;

import com.dreampath.domain.career.dto.AnalysisResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Python AI 서비스를 호출하는 클라이언트
 */
@Slf4j
@Service
public class PythonAIService {

    private final RestTemplate restTemplate;
    private final String pythonAiServiceUrl;

    public PythonAIService(
            RestTemplate restTemplate,
            @Value("${python.ai.service.url:http://localhost:8000}") String pythonAiServiceUrl) {
        this.restTemplate = restTemplate;
        this.pythonAiServiceUrl = pythonAiServiceUrl;
        log.info("Python AI 서비스 클라이언트 초기화 완료. URL: {}", pythonAiServiceUrl);
    }

    /**
     * Python AI 서비스를 호출하여 진로 분석을 수행합니다.
     */
    public AnalysisResponse analyzeCareer(String sessionId, List<Map<String, String>> conversationHistory) {
        try {
            String url = pythonAiServiceUrl + "/api/analyze";

            // 요청 본문 구성
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("sessionId", sessionId);
            requestBody.put("conversationHistory", conversationHistory);

            // HTTP 헤더 설정
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            // Python AI 서비스 호출
            log.info("Python AI 서비스 호출: {}", url);
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> responseBody = (Map<String, Object>) response.getBody();
                return convertToAnalysisResponse(responseBody);
            } else {
                throw new RuntimeException("Python AI 서비스 응답 오류: " + response.getStatusCode());
            }

        } catch (Exception e) {
            log.error("Python AI 서비스 호출 실패", e);
            throw new RuntimeException("진로 분석 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Python 서비스 응답을 Java DTO로 변환
     */
    @SuppressWarnings("unchecked")
    private AnalysisResponse convertToAnalysisResponse(Map<String, Object> response) {
        try {
            // 감정 분석
            Map<String, Object> emotionMap = (Map<String, Object>) response.get("emotion");
            AnalysisResponse.EmotionAnalysis emotion = AnalysisResponse.EmotionAnalysis.builder()
                    .description((String) emotionMap.get("description"))
                    .score(((Number) emotionMap.get("score")).intValue())
                    .emotionalState((String) emotionMap.get("emotionalState"))
                    .build();

            // 성향 분석
            Map<String, Object> personalityMap = (Map<String, Object>) response.get("personality");
            AnalysisResponse.PersonalityAnalysis personality = AnalysisResponse.PersonalityAnalysis.builder()
                    .description((String) personalityMap.get("description"))
                    .type((String) personalityMap.get("type"))
                    .big_five((Map<String, Object>) personalityMap.get("big_five"))
                    .strengths((List<String>) personalityMap.get("strengths"))
                    .growthAreas((List<String>) personalityMap.get("growthAreas"))
                    .build();

            // 흥미 분석
            Map<String, Object> interestMap = (Map<String, Object>) response.get("interest");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> areasList = (List<Map<String, Object>>) interestMap.get("areas");
            List<AnalysisResponse.InterestArea> interestAreas = new ArrayList<>();
            if (areasList != null) {
                for (Map<String, Object> area : areasList) {
                    interestAreas.add(AnalysisResponse.InterestArea.builder()
                            .name((String) area.get("name"))
                            .level(((Number) area.get("level")).intValue())
                            .description((String) area.get("description"))
                            .build());
                }
            }
            AnalysisResponse.InterestAnalysis interest = AnalysisResponse.InterestAnalysis.builder()
                    .description((String) interestMap.get("description"))
                    .areas(interestAreas)
                    .build();

            // 진로 추천
            List<Map<String, Object>> careersList = (List<Map<String, Object>>) response.get("recommendedCareers");
            List<AnalysisResponse.CareerRecommendation> recommendations = new ArrayList<>();
            if (careersList != null) {
                for (Map<String, Object> career : careersList) {
                    recommendations.add(AnalysisResponse.CareerRecommendation.builder()
                            .careerName((String) career.get("careerName"))
                            .description((String) career.get("description"))
                            .matchScore(((Number) career.get("matchScore")).intValue())
                            .reasons((List<String>) career.get("reasons"))
                            .build());
                }
            }

            return AnalysisResponse.builder()
                    .sessionId((String) response.get("sessionId"))
                    .emotion(emotion)
                    .personality(personality)
                    .interest(interest)
                    .comprehensiveAnalysis((String) response.get("comprehensiveAnalysis"))
                    .recommendedCareers(recommendations)
                    .build();

        } catch (Exception e) {
            log.error("응답 변환 실패", e);
            throw new RuntimeException("응답 변환 실패: " + e.getMessage(), e);
        }
    }

    /**
     * 사용자의 채용공고 추천을 백그라운드에서 계산하도록 트리거합니다.
     * 비동기로 실행되며 즉시 반환됩니다.
     *
     * @param userId 사용자 ID
     */
    public void triggerJobRecommendationCalculation(Long userId) {
        try {
            String url = pythonAiServiceUrl + "/api/job-agent/recommendations/calculate/"
                    + userId + "?background=true";

            log.info("채용공고 추천 계산 트리거: userId={}, url={}", userId, url);

            // 비동기로 POST 요청 (응답 대기하지 않음)
            new Thread(() -> {
                try {
                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    HttpEntity<Void> request = new HttpEntity<>(headers);

                    ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

                    if (response.getStatusCode().is2xxSuccessful()) {
                        log.info("채용공고 추천 계산 트리거 성공: userId={}", userId);
                    } else {
                        log.warn("채용공고 추천 계산 트리거 응답 오류: userId={}, status={}",
                                userId, response.getStatusCode());
                    }

                } catch (Exception e) {
                    // 실패해도 메인 로직에 영향 없도록 로그만 기록
                    log.error("채용공고 추천 계산 트리거 실패: userId={}", userId, e);
                }
            }, "JobRecommendationTrigger-" + userId).start();

        } catch (Exception e) {
            // 트리거 자체가 실패해도 메인 로직에 영향 없도록 로그만 기록
            log.error("채용공고 추천 계산 트리거 실패: userId={}", userId, e);
        }
    }
}
