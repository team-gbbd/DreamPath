package com.dreampath.config.dw;

import com.dreampath.service.dw.ai.CareerAssistant;
import com.dreampath.service.dw.ai.CareerAnalysisAssistant;
import com.dreampath.service.dw.ai.IdentityAnalyzer;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.store.memory.chat.ChatMemoryStore;
import dev.langchain4j.store.memory.chat.InMemoryChatMemoryStore;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * LangChain4j 설정
 * AI Services, Chat Model, Memory 등을 구성합니다.
 */
@Slf4j
@Configuration
public class LangChainConfig {

    @Value("${openai.api.key}")
    private String openAiApiKey;

    @Value("${openai.api.model}")
    private String modelName;

    /**
     * OpenAI Chat Model 설정
     */
    @Bean
    public ChatLanguageModel chatLanguageModel() {
        log.info("LangChain4j ChatLanguageModel 초기화 - 모델: {}", modelName);
        
        return OpenAiChatModel.builder()
                .apiKey(openAiApiKey)
                .modelName(modelName)
                .temperature(0.7)
                .maxTokens(1000)
                .timeout(Duration.ofSeconds(60))
                .logRequests(true)
                .logResponses(true)
                .build();
    }

    /**
     * 분석용 Chat Model (더 정확한 분석을 위해 낮은 temperature)
     */
    @Bean
    public ChatLanguageModel analysisModel() {
        log.info("LangChain4j Analysis Model 초기화 - 모델: {}", modelName);
        
        return OpenAiChatModel.builder()
                .apiKey(openAiApiKey)
                .modelName(modelName)
                .temperature(0.5)
                .maxTokens(2000)
                .timeout(Duration.ofSeconds(60))
                .build();
    }

    /**
     * Chat Memory Store
     * 세션별 대화 내역을 저장합니다.
     */
    @Bean
    public ChatMemoryStore chatMemoryStore() {
        log.info("LangChain4j ChatMemoryStore 초기화");
        return new InMemoryChatMemoryStore();
    }

    /**
     * Career Assistant AI Service
     * 대화형 진로 상담을 담당합니다.
     */
    @Bean
    public CareerAssistant careerAssistant(
            ChatLanguageModel chatLanguageModel,
            ChatMemoryStore chatMemoryStore) {
        
        log.info("CareerAssistant AI Service 초기화");
        
        return AiServices.builder(CareerAssistant.class)
                .chatLanguageModel(chatLanguageModel)
                .chatMemoryProvider(sessionId -> 
                    MessageWindowChatMemory.builder()
                        .chatMemoryStore(chatMemoryStore)
                        .id(sessionId)
                        .maxMessages(10) // 최근 10개 메시지 유지
                        .build()
                )
                .build();
    }

    /**
     * Career Analysis Assistant AI Service
     * 진로 분석을 담당합니다.
     */
    @Bean
    public CareerAnalysisAssistant careerAnalysisAssistant(ChatLanguageModel analysisModel) {
        log.info("CareerAnalysisAssistant AI Service 초기화");
        
        return AiServices.builder(CareerAnalysisAssistant.class)
                .chatLanguageModel(analysisModel)
                .build();
    }

    /**
     * Identity Analyzer AI Service
     * 실시간 정체성 분석을 담당합니다.
     */
    @Bean
    public IdentityAnalyzer identityAnalyzer(ChatLanguageModel analysisModel) {
        log.info("IdentityAnalyzer AI Service 초기화");
        
        return AiServices.builder(IdentityAnalyzer.class)
                .chatLanguageModel(analysisModel)
                .build();
    }
}

