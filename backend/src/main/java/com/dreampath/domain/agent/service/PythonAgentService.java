package com.dreampath.domain.agent.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Python AI 서비스의 AI 에이전트 기능을 호출하는 클라이언트
 */
@Slf4j
@Service
public class PythonAgentService {

    private final RestTemplate restTemplate;
    private final String pythonAiServiceUrl;

    public PythonAgentService(
            RestTemplate restTemplate,
            @Value("${python.ai.service.url:http://localhost:8000}") String pythonAiServiceUrl) {
        this.restTemplate = restTemplate;
        this.pythonAiServiceUrl = pythonAiServiceUrl;
        log.info("Python AI 에이전트 서비스 클라이언트 초기화 완료. URL: {}", pythonAiServiceUrl);
    }

    // ============== 1. 채용 공고 추천 ==============

    /**
     * 채용 공고 추천
     */
    public Map<String, Object> getJobRecommendations(Map<String, Object> requestBody) {
        return callPythonAgent("/api/agent/job-recommendations", requestBody);
    }

    /**
     * 실시간 채용 공고 추천
     */
    public Map<String, Object> getRealTimeRecommendations(Map<String, Object> requestBody) {
        return callPythonAgent("/api/agent/job-recommendations/realtime", requestBody);
    }

    // ============== 2. 지원 현황 추적 ==============

    /**
     * 지원 현황 분석
     */
    public Map<String, Object> analyzeApplications(Map<String, Object> requestBody) {
        return callPythonAgent("/api/agent/applications/analyze", requestBody);
    }

    /**
     * 지원 추적
     */
    public Map<String, Object> trackApplication(Map<String, Object> requestBody) {
        return callPythonAgent("/api/agent/applications/track", requestBody);
    }

    // ============== 3. 커리어 성장 제안 ==============

    /**
     * 커리어 갭 분석
     */
    public Map<String, Object> analyzeCareerGap(Map<String, Object> requestBody) {
        return callPythonAgent("/api/agent/career/gap-analysis", requestBody);
    }

    /**
     * 스킬 개발 제안
     */
    public Map<String, Object> suggestSkillDevelopment(Map<String, Object> requestBody) {
        return callPythonAgent("/api/agent/career/skill-development", requestBody);
    }

    /**
     * 성장 타임라인 생성
     */
    public Map<String, Object> createGrowthTimeline(Map<String, Object> requestBody) {
        return callPythonAgent("/api/agent/career/timeline", requestBody);
    }

    /**
     * 시장 트렌드 분석
     */
    public Map<String, Object> analyzeMarketTrends(Map<String, Object> requestBody) {
        return callPythonAgent("/api/agent/career/market-trends", requestBody);
    }

    // ============== 4. 이력서 최적화 ==============

    /**
     * 이력서 최적화
     */
    public Map<String, Object> optimizeResume(Map<String, Object> requestBody) {
        return callPythonAgent("/api/agent/resume/optimize", requestBody);
    }

    /**
     * 이력서 품질 분석
     */
    public Map<String, Object> analyzeResumeQuality(Map<String, Object> requestBody) {
        return callPythonAgent("/api/agent/resume/analyze", requestBody);
    }

    /**
     * 자기소개서 생성
     */
    public Map<String, Object> generateCoverLetter(Map<String, Object> requestBody) {
        return callPythonAgent("/api/agent/resume/cover-letter", requestBody);
    }

    /**
     * 키워드 추천
     */
    public Map<String, Object> suggestKeywords(Map<String, Object> requestBody) {
        return callPythonAgent("/api/agent/resume/keywords", requestBody);
    }

    /**
     * 성향 분석 에이전트 호출
     */
    public Map<String, Object> callPersonalityAgent(Map<String, Object> requestBody) {
        log.info("PersonalityAgent payload: {}", requestBody);
        return callPythonAgent("/api/agent/personality", requestBody);
    }

    // ============== 공통 메서드 ==============

    /**
     * Python AI 에이전트 호출 공통 메서드
     */
    private Map<String, Object> callPythonAgent(String endpoint, Map<String, Object> requestBody) {
        try {
            String url = pythonAiServiceUrl + endpoint;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            log.debug("Python AI 에이전트 호출: endpoint={}", endpoint);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url,
                org.springframework.http.HttpMethod.POST,
                request,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> responseBody = response.getBody();
                if (responseBody == null) {
                    throw new RuntimeException("Python AI 서비스 응답 본문이 null입니다.");
                }
                return responseBody;
            } else {
                throw new RuntimeException("Python AI 서비스 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Python AI 에이전트 호출 실패: endpoint={}", endpoint, e);
            throw new RuntimeException("Python AI 에이전트 호출 실패: " + e.getMessage(), e);
        }
    }
}
