package com.dreampath.domain.career.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Python AI 서비스의 정체성 분석 기능을 호출하는 클라이언트
 */
@Slf4j
@Service
public class PythonIdentityService {

    private final RestTemplate restTemplate;
    private final String pythonAiServiceUrl;

    public PythonIdentityService(
            RestTemplate restTemplate,
            @Value("${python.ai.service.url:http://localhost:8000}") String pythonAiServiceUrl) {
        this.restTemplate = restTemplate;
        this.pythonAiServiceUrl = pythonAiServiceUrl;
        log.info("Python Identity 서비스 클라이언트 초기화 완료. URL: {}", pythonAiServiceUrl);
    }

    /**
     * 정체성 명확도 평가
     */
    public Map<String, Object> assessClarity(String conversationHistory, String sessionId) {
        try {
            String url = pythonAiServiceUrl + "/api/identity/clarity";

            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("conversationHistory", conversationHistory);
            if (sessionId != null) {
                requestBody.put("sessionId", sessionId);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

            log.debug("정체성 명확도 평가 요청: {} (sessionId: {})", url, sessionId);
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> responseBody = (Map<String, Object>) response.getBody();
                return responseBody;
            } else {
                throw new RuntimeException("Python AI 서비스 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("정체성 명확도 평가 실패", e);
            throw new RuntimeException("명확도 평가 실패: " + e.getMessage(), e);
        }
    }

    /**
     * 정체성 특징 추출
     */
    public Map<String, Object> extractIdentity(String conversationHistory, String sessionId) {
        try {
            String url = pythonAiServiceUrl + "/api/identity/extract";

            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("conversationHistory", conversationHistory);
            if (sessionId != null) {
                requestBody.put("sessionId", sessionId);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

            log.debug("정체성 특징 추출 요청: {} (sessionId: {})", url, sessionId);
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> responseBody = (Map<String, Object>) response.getBody();
                return responseBody;
            } else {
                throw new RuntimeException("Python AI 서비스 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("정체성 특징 추출 실패", e);
            throw new RuntimeException("정체성 추출 실패: " + e.getMessage(), e);
        }
    }

    /**
     * 최근 인사이트 생성
     */
    public Map<String, Object> generateInsight(String recentMessages, String previousContext) {
        try {
            String url = pythonAiServiceUrl + "/api/identity/insight";

            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("recentMessages", recentMessages);
            requestBody.put("previousContext", previousContext);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

            log.debug("인사이트 생성 요청: {}", url);
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> responseBody = (Map<String, Object>) response.getBody();
                return responseBody;
            } else {
                throw new RuntimeException("Python AI 서비스 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("인사이트 생성 실패", e);
            throw new RuntimeException("인사이트 생성 실패: " + e.getMessage(), e);
        }
    }

    /**
     * 단계 진행 평가
     */
    public Map<String, Object> assessStageProgress(String conversationHistory, String currentStage, String sessionId) {
        try {
            String url = pythonAiServiceUrl + "/api/identity/progress";

            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("conversationHistory", conversationHistory);
            requestBody.put("currentStage", currentStage);
            if (sessionId != null) {
                requestBody.put("sessionId", sessionId);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

            log.debug("단계 진행 평가 요청: {} (sessionId: {})", url, sessionId);
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> responseBody = (Map<String, Object>) response.getBody();
                return responseBody;
            } else {
                throw new RuntimeException("Python AI 서비스 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("단계 진행 평가 실패", e);
            throw new RuntimeException("진행 평가 실패: " + e.getMessage(), e);
        }
    }
}
