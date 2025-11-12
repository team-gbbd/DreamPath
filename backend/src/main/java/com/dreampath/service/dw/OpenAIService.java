package com.dreampath.service.dw;

import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.service.OpenAiService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

@Slf4j
@Service
public class OpenAIService {

    private final OpenAiService openAiService;
    private final String model;

    public OpenAIService(
            @Value("${openai.api.key}") String apiKey,
            @Value("${openai.api.model}") String model) {
        if (apiKey == null || apiKey.isEmpty() || apiKey.equals("your-api-key-here")) {
            log.error("OpenAI API 키가 설정되지 않았습니다. application.yml 또는 환경변수 OPENAI_API_KEY를 확인하세요.");
            throw new IllegalStateException("OpenAI API 키가 설정되지 않았습니다. 환경변수 OPENAI_API_KEY를 설정하거나 application.yml에 유효한 API 키를 입력하세요.");
        }
        this.openAiService = new OpenAiService(apiKey, Duration.ofSeconds(60));
        this.model = model;
        log.info("OpenAI 서비스 초기화 완료. 모델: {}", model);
    }

    public String getChatCompletion(List<ChatMessage> messages) {
        try {
            ChatCompletionRequest request = ChatCompletionRequest.builder()
                    .model(model)
                    .messages(messages)
                    .temperature(0.7)
                    .maxTokens(1000)
                    .build();

            var completion = openAiService.createChatCompletion(request);
            return completion.getChoices().get(0).getMessage().getContent();
        } catch (Exception e) {
            log.error("OpenAI API 호출 실패: {}", e.getMessage(), e);
            if (e.getMessage() != null && e.getMessage().contains("Incorrect API key")) {
                throw new RuntimeException("OpenAI API 키가 유효하지 않습니다. 환경변수 OPENAI_API_KEY를 확인하세요.", e);
            } else if (e.getMessage() != null && e.getMessage().contains("rate limit")) {
                throw new RuntimeException("OpenAI API 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.", e);
            }
            throw new RuntimeException("AI 응답 생성 실패: " + e.getMessage(), e);
        }
    }

    public String getAnalysis(List<ChatMessage> messages, String analysisType) {
        try {
            ChatCompletionRequest request = ChatCompletionRequest.builder()
                    .model(model)
                    .messages(messages)
                    .temperature(0.5)
                    .maxTokens(2000)
                    .build();

            var completion = openAiService.createChatCompletion(request);
            return completion.getChoices().get(0).getMessage().getContent();
        } catch (Exception e) {
            log.error("분석 API 호출 실패: {}, {}", analysisType, e.getMessage(), e);
            if (e.getMessage() != null && e.getMessage().contains("Incorrect API key")) {
                throw new RuntimeException("OpenAI API 키가 유효하지 않습니다. 환경변수 OPENAI_API_KEY를 확인하세요.", e);
            } else if (e.getMessage() != null && e.getMessage().contains("rate limit")) {
                throw new RuntimeException("OpenAI API 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.", e);
            }
            throw new RuntimeException("분석 생성 실패: " + e.getMessage(), e);
        }
    }
}

