package com.dreampath.service.dw;

import com.dreampath.dto.dw.ChatRequest;
import com.dreampath.dto.dw.ChatResponse;
import com.dreampath.entity.dw.CareerSession;
import com.dreampath.entity.dw.ChatMessage;
import com.dreampath.repository.dw.CareerSessionRepository;
import com.dreampath.repository.dw.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CareerChatService {

    private final CareerSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final OpenAIService openAIService;

    private static final String SYSTEM_PROMPT = """
            당신은 친근하고 공감적인 진로 상담 전문가입니다.
            학생들과 대화하면서 다음을 파악해주세요:
            
            1. 감정 상태: 현재 느끼는 감정, 진로에 대한 불안이나 기대
            2. 성향: 성격적 특성, 선호하는 활동 방식, 대인관계 스타일
            3. 흥미: 관심 분야, 좋아하는 활동, 배우고 싶은 것
            
            자연스러운 대화를 통해 학생을 이해하고, 적절한 질문으로 더 깊은 대화를 이끌어주세요.
            대화는 한국어로 진행하며, 친근하고 따뜻한 톤을 유지해주세요.
            한 번에 너무 많은 질문을 하지 말고, 학생의 답변에 공감하며 자연스럽게 대화를 이어가세요.
            """;

    @Transactional
    public ChatResponse chat(ChatRequest request) {
        // 세션 찾기 또는 생성
        CareerSession session = getOrCreateSession(request.getSessionId(), request.getUserId());
        
        // 사용자 메시지 저장
        ChatMessage userMessage = ChatMessage.builder()
                .session(session)
                .role(ChatMessage.MessageRole.USER)
                .content(request.getMessage())
                .build();
        messageRepository.save(userMessage);
        session.getMessages().add(userMessage);

        // OpenAI에 전송할 메시지 구성
        List<com.theokanning.openai.completion.chat.ChatMessage> openAIMessages = new ArrayList<>();
        
        // 시스템 프롬프트 추가
        openAIMessages.add(new com.theokanning.openai.completion.chat.ChatMessage("system", SYSTEM_PROMPT));
        
        // 대화 히스토리 추가 (최근 10개)
        session.getMessages().stream()
                .sorted((m1, m2) -> m1.getTimestamp().compareTo(m2.getTimestamp()))
                .limit(10)
                .forEach(msg -> {
                    String role = msg.getRole() == ChatMessage.MessageRole.USER ? "user" : "assistant";
                    openAIMessages.add(new com.theokanning.openai.completion.chat.ChatMessage(role, msg.getContent()));
                });

        // AI 응답 받기
        String aiResponse = openAIService.getChatCompletion(openAIMessages);

        // AI 응답 저장
        ChatMessage assistantMessage = ChatMessage.builder()
                .session(session)
                .role(ChatMessage.MessageRole.ASSISTANT)
                .content(aiResponse)
                .build();
        messageRepository.save(assistantMessage);
        session.getMessages().add(assistantMessage);

        sessionRepository.save(session);

        return ChatResponse.builder()
                .sessionId(session.getSessionId())
                .message(aiResponse)
                .role("assistant")
                .timestamp(System.currentTimeMillis())
                .build();
    }

    @Transactional
    public CareerSession getOrCreateSession(String sessionId, String userId) {
        if (sessionId != null) {
            return sessionRepository.findBySessionId(sessionId)
                    .orElseGet(() -> createNewSession(userId));
        }
        return createNewSession(userId);
    }

    private CareerSession createNewSession(String userId) {
        CareerSession session = CareerSession.builder()
                .sessionId(UUID.randomUUID().toString())
                .userId(userId)
                .status(CareerSession.SessionStatus.ACTIVE)
                .messages(new ArrayList<>())
                .build();
        return sessionRepository.save(session);
    }

    @Transactional(readOnly = true)
    public List<ChatResponse> getSessionHistory(String sessionId) {
        CareerSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));

        return session.getMessages().stream()
                .map(msg -> ChatResponse.builder()
                        .sessionId(sessionId)
                        .message(msg.getContent())
                        .role(msg.getRole().name().toLowerCase())
                        .timestamp(msg.getTimestamp().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli())
                        .build())
                .collect(Collectors.toList());
    }
}

