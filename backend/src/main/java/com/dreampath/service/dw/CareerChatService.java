package com.dreampath.service.dw;

import com.dreampath.dto.dw.ChatRequest;
import com.dreampath.dto.dw.ChatResponse;
import com.dreampath.entity.dw.CareerSession;
import com.dreampath.entity.dw.ChatMessage;
import com.dreampath.repository.dw.CareerSessionRepository;
import com.dreampath.repository.dw.ChatMessageRepository;
import com.dreampath.service.dw.ai.CareerAssistant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 진로 상담 채팅 서비스
 * 
 * 4단계 대화 프로세스를 통해 학생의 진로 정체성을 점진적으로 확립합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CareerChatService {

    private final CareerSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final CareerAssistant careerAssistant;

    @Transactional
    public ChatResponse chat(ChatRequest request) {
        log.info("채팅 요청 - 세션: {}, 사용자: {}", request.getSessionId(), request.getUserId());
        
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

        // 단계별 메시지 카운트 증가
        session.setStageMessageCount(session.getStageMessageCount() + 1);

        // LangChain4j AI Service를 통해 응답 생성
        // 현재 대화 단계를 전달하여 단계별 질문 유도
        String aiResponse = careerAssistant.chat(
            session.getSessionId(), 
            request.getMessage(),
            session.getCurrentStage().name()
        );

        // AI 응답 저장
        ChatMessage assistantMessage = ChatMessage.builder()
                .session(session)
                .role(ChatMessage.MessageRole.ASSISTANT)
                .content(aiResponse)
                .build();
        messageRepository.save(assistantMessage);
        session.getMessages().add(assistantMessage);

        sessionRepository.save(session);

        log.info("응답 생성 완료 - 세션: {}, 단계: {}, 메시지 수: {}", 
            session.getSessionId(), 
            session.getCurrentStage().getDisplayName(),
            session.getStageMessageCount());

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
        log.info("새 세션 생성 - ID: {}, 초기 단계: {}", 
            session.getSessionId(), 
            session.getCurrentStage().getDisplayName());
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

    /**
     * 세션의 전체 대화 내용을 텍스트로 반환
     * 정체성 분석 시 사용됩니다
     */
    @Transactional(readOnly = true)
    public String getConversationHistory(String sessionId) {
        CareerSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));

        return session.getMessages().stream()
                .sorted((m1, m2) -> m1.getTimestamp().compareTo(m2.getTimestamp()))
                .map(msg -> {
                    String role = msg.getRole() == ChatMessage.MessageRole.USER ? "학생" : "상담사";
                    return role + ": " + msg.getContent();
                })
                .collect(Collectors.joining("\n\n"));
    }
    
    /**
     * 최근 N개 메시지를 텍스트로 반환
     */
    @Transactional(readOnly = true)
    public String getRecentMessages(String sessionId, int count) {
        CareerSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));

        return session.getMessages().stream()
                .sorted((m1, m2) -> m2.getTimestamp().compareTo(m1.getTimestamp()))
                .limit(count)
                .sorted((m1, m2) -> m1.getTimestamp().compareTo(m2.getTimestamp()))
                .map(msg -> {
                    String role = msg.getRole() == ChatMessage.MessageRole.USER ? "학생" : "상담사";
                    return role + ": " + msg.getContent();
                })
                .collect(Collectors.joining("\n\n"));
    }
}
