package com.dreampath.domain.career.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Python AI 서비스의 채팅 기능을 호출하는 클라이언트
 */
@Slf4j
@Service
public class PythonChatService {

    private final RestTemplate restTemplate;
    private final String pythonAiServiceUrl;

    public PythonChatService(
            RestTemplate restTemplate,
            @Value("${python.ai.service.url:http://localhost:8000}") String pythonAiServiceUrl) {
        this.restTemplate = restTemplate;
        this.pythonAiServiceUrl = pythonAiServiceUrl;
        log.info("Python Chat 서비스 클라이언트 초기화 완료. URL: {}", pythonAiServiceUrl);
    }

    /**
     * 대화형 진로 상담 응답 생성 (에이전트 액션 포함)
     *
     * @return Map containing "message" (String) and optionally "agentAction" (Map)
     */
    public Map<String, Object> generateChatResponse(
            String sessionId,
            String userMessage,
            String currentStage,
            List<Map<String, String>> conversationHistory,
            Map<String, Object> surveyData,
            Long userId,
            Map<String, Object> identityStatus) {
        try {
            String url = pythonAiServiceUrl + "/api/chat";

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("sessionId", sessionId);
            requestBody.put("userMessage", userMessage);
            requestBody.put("currentStage", currentStage);
            requestBody.put("conversationHistory", conversationHistory);
            requestBody.put("surveyData", surveyData);
            requestBody.put("userId", userId);
            requestBody.put("identityStatus", identityStatus);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            log.debug("채팅 응답 생성 요청: sessionId={}, stage={}, userId={}", sessionId, currentStage, userId);
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
                String message = (String) responseBody.get("message");
                if (message == null) {
                    throw new RuntimeException("Python AI 서비스 응답에 message가 없습니다.");
                }

                // 응답 맵 구성 (message, taskId, agentAction 포함)
                Map<String, Object> result = new HashMap<>();
                result.put("message", message);

                // taskId가 있으면 포함 (백그라운드 에이전트 폴링용)
                if (responseBody.containsKey("taskId") && responseBody.get("taskId") != null) {
                    result.put("taskId", responseBody.get("taskId"));
                    log.info("에이전트 태스크 시작: sessionId={}, taskId={}", sessionId, responseBody.get("taskId"));
                }

                // agentAction이 있으면 포함
                if (responseBody.containsKey("agentAction") && responseBody.get("agentAction") != null) {
                    result.put("agentAction", responseBody.get("agentAction"));
                    log.info("에이전트 액션 감지: sessionId={}", sessionId);
                }

                return result;
            } else {
                throw new RuntimeException("Python AI 서비스 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("채팅 응답 생성 실패", e);
            throw new RuntimeException("채팅 응답 생성 실패: " + e.getMessage(), e);
        }
    }
}

