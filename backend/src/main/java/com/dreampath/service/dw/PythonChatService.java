package com.dreampath.service.dw;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
     * 대화형 진로 상담 응답 생성
     */
    public String generateChatResponse(
            String sessionId,
            String userMessage,
            String currentStage,
            List<Map<String, String>> conversationHistory,
            Map<String, Object> surveyData) {
        try {
            String url = pythonAiServiceUrl + "/api/chat";
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("sessionId", sessionId);
            requestBody.put("userMessage", userMessage);
            requestBody.put("currentStage", currentStage);
            requestBody.put("conversationHistory", conversationHistory);
            requestBody.put("surveyData", surveyData);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            log.debug("채팅 응답 생성 요청: sessionId={}, stage={}", sessionId, currentStage);
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> responseBody = (Map<String, Object>) response.getBody();
                String message = (String) responseBody.get("message");
                if (message == null) {
                    throw new RuntimeException("Python AI 서비스 응답에 message가 없습니다.");
                }
                return message;
            } else {
                throw new RuntimeException("Python AI 서비스 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("채팅 응답 생성 실패", e);
            throw new RuntimeException("채팅 응답 생성 실패: " + e.getMessage(), e);
        }
    }
}

