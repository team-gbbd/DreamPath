package com.dreampath.domain.career.service;

import com.dreampath.domain.agent.personality.dto.PersonalityAgentRequest;
import com.dreampath.domain.agent.personality.dto.PersonalityAgentResponse;
import com.dreampath.domain.agent.personality.service.PersonalityAgentService;
import com.dreampath.domain.career.dto.AgentAction;
import com.dreampath.domain.career.dto.ChatRequest;
import com.dreampath.domain.career.dto.ChatResponse;
import com.dreampath.domain.career.entity.CareerSession;
import com.dreampath.domain.career.entity.ChatMessage;
import com.dreampath.domain.career.repository.CareerSessionRepository;
import com.dreampath.domain.career.repository.ChatMessageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 진로 상담 채팅 서비스
 *
 * 4단계 대화 프로세스를 통해 학생의 진로 정체성을 점진적으로 확립합니다.
 * Python AI 서비스의 LangChain 기반 채팅 기능을 사용합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CareerChatService {

    private final CareerSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final PythonChatService pythonChatService;
    private final PersonalityAgentService personalityAgentService;
    private final TransactionTemplate txTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatResponse chat(ChatRequest request) {
        log.info("채팅 요청 - 세션: {}, 사용자: {}", request.getSessionId(), request.getUserId());

        // 1단계: 세션 조회 및 사용자 메시지 저장 (트랜잭션 1)
        ChatContext context = txTemplate.execute(status -> {
            CareerSession session = getOrCreateSession(request.getSessionId(), request.getUserId());

            ChatContext ctx = new ChatContext();
            ctx.sessionId = session.getSessionId();

            ChatMessage userMessage = ChatMessage.builder()
                    .session(session)
                    .role(ChatMessage.MessageRole.USER)
                    .content(request.getMessage())
                    .build();
            messageRepository.save(userMessage);
            session.getMessages().add(userMessage);
            session.setStageMessageCount(session.getStageMessageCount() + 1);
            sessionRepository.save(session);

            ctx.currentStage = session.getCurrentStage().name();
            ctx.conversationHistory = session.getMessages().stream()
                    .map(msg -> {
                        Map<String, String> message = new HashMap<>();
                        message.put("role", msg.getRole().name());
                        message.put("content", msg.getContent());
                        return message;
                    })
                    .collect(Collectors.toList());

            if (request.getUserId() != null && !request.getUserId().isEmpty()) {
                try {
                    ctx.userIdLong = Long.parseLong(request.getUserId());
                } catch (NumberFormatException e) {
                    log.warn("userId 파싱 실패: {}", request.getUserId());
                }
            }

            if (request.getIdentityStatus() != null) {
                ctx.identityStatusMap = objectMapper.convertValue(request.getIdentityStatus(), Map.class);
            }

            // 사용자 메시지 수 저장 (PersonalityAgent 트리거용)
            ctx.userMessageCount = session.getMessages().stream()
                    .filter(msg -> msg.getRole() == ChatMessage.MessageRole.USER)
                    .count();

            return ctx;
        });

        // 2단계: AI 서비스 호출 (트랜잭션 없음)
        Map<String, Object> aiResult = pythonChatService.generateChatResponse(
            context.sessionId,
            request.getMessage(),
            context.currentStage,
            context.conversationHistory,
            null,
            context.userIdLong,
            context.identityStatusMap
        );

        // 3단계: AI 응답 저장 (트랜잭션 2)
        return txTemplate.execute(status -> {
            CareerSession session = sessionRepository.findBySessionId(context.sessionId)
                    .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));

            String aiResponse = (String) aiResult.get("message");

            ChatMessage assistantMessage = ChatMessage.builder()
                    .session(session)
                    .role(ChatMessage.MessageRole.ASSISTANT)
                    .content(aiResponse)
                    .build();
            messageRepository.save(assistantMessage);
            session.getMessages().add(assistantMessage);
            sessionRepository.save(session);

            AgentAction agentAction = convertToAgentAction(aiResult.get("agentAction"));
            String taskId = (String) aiResult.get("taskId");

            log.info("응답 생성 완료 - 세션: {}, 단계: {}, 메시지 수: {}, 에이전트액션: {}, taskId: {}",
                session.getSessionId(),
                session.getCurrentStage().getDisplayName(),
                session.getStageMessageCount(),
                agentAction != null ? agentAction.getType() : "없음",
                taskId);

            // Personality Agent 트리거 체크 (사용자 메시지 12개 이상)
            Object personalityAgentResult = null;
            if (context.userMessageCount >= 12) {
                try {
                    log.info("Personality Agent 트리거 조건 충족: {} user messages", context.userMessageCount);
                    PersonalityAgentRequest agentRequest = PersonalityAgentRequest.builder()
                            .sessionId(session.getSessionId())
                            .build();

                    PersonalityAgentResponse agentResponse = personalityAgentService.run(agentRequest);
                    if (agentResponse != null) {
                        personalityAgentResult = agentResponse;
                        log.info("Personality Agent 결과 생성 완료: summary={}, mbti={}",
                                agentResponse.getSummary() != null
                                        ? agentResponse.getSummary().substring(0, Math.min(50, agentResponse.getSummary().length())) + "..."
                                        : "null",
                                agentResponse.getMbti());
                    }
                } catch (Exception e) {
                    log.error("Personality Agent 실행 실패 (무시됨): {}", e.getMessage(), e);
                }
            }

            return ChatResponse.builder()
                    .sessionId(session.getSessionId())
                    .message(aiResponse)
                    .role("assistant")
                    .timestamp(System.currentTimeMillis())
                    .agentAction(agentAction)
                    .taskId(taskId)
                    .personalityAgentResult(personalityAgentResult)
                    .build();
        });
    }

    /**
     * AI 호출에 필요한 컨텍스트 정보를 담는 내부 클래스
     */
    private static class ChatContext {
        String sessionId;
        String currentStage;
        List<Map<String, String>> conversationHistory;
        Long userIdLong;
        Map<String, Object> identityStatusMap;
        long userMessageCount = 0;
    }

    public CareerSession getOrCreateSession(String sessionId, String userId) {
        return getOrCreateSession(sessionId, userId, false);
    }

    /**
     * 세션 조회 또는 생성 (forceNew 옵션 지원)
     */
    @Transactional
    public CareerSession getOrCreateSession(String sessionId, String userId, boolean forceNewSession) {
        if (forceNewSession) {
            return createNewSession(userId);
        }

        if (sessionId != null && !sessionId.isBlank()) {
            return sessionRepository.findBySessionId(sessionId)
                    .orElseGet(() -> createNewSession(userId));
        }

        if (userId != null && !userId.isBlank()) {
            return sessionRepository
                    .findFirstByUserIdAndStatusOrderByUpdatedAtDesc(userId, CareerSession.SessionStatus.ACTIVE)
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

    /**
     * 기존 ACTIVE 세션을 닫고 새 세션 생성 (새 상담 시작 시 사용)
     */
    @Transactional
    public CareerSession createNewSessionForUser(String userId) {
        // 기존 ACTIVE 세션들 모두 COMPLETED로 변경
        List<CareerSession> activeSessions = sessionRepository.findAllByUserIdAndStatus(
            userId, CareerSession.SessionStatus.ACTIVE);

        for (CareerSession activeSession : activeSessions) {
            activeSession.setStatus(CareerSession.SessionStatus.COMPLETED);
            sessionRepository.save(activeSession);
            log.info("기존 세션 종료 - ID: {}", activeSession.getSessionId());
        }

        // 새 세션 생성
        return createNewSession(userId);
    }

    @Transactional(readOnly = true)
    public List<ChatResponse> getSessionHistory(String sessionId) {
        // JOIN FETCH로 메시지까지 함께 조회 (Lazy loading 이슈 방지)
        CareerSession session = sessionRepository.findBySessionIdWithMessages(sessionId)
                .orElse(null);

        if (session == null) {
            return List.of(); // 빈 배열 반환
        }

        return session.getMessages().stream()
                .sorted((m1, m2) -> m1.getTimestamp().compareTo(m2.getTimestamp()))
                .map(msg -> ChatResponse.builder()
                        .sessionId(sessionId)
                        .message(msg.getContent())
                        .role(msg.getRole().name().toLowerCase())
                        .timestamp(msg.getTimestamp().atZone(java.time.ZoneId.systemDefault())
                                .toInstant().toEpochMilli())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * 세션의 전체 대화 내용을 텍스트로 반환
     * 정체성 분석 시 사용됩니다
     */
    @Transactional(readOnly = true)
    public String getConversationHistory(String sessionId) {
        log.info("getConversationHistory called: sessionId={}", sessionId);

        CareerSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));

        String history = session.getMessages().stream()
                .sorted((m1, m2) -> m1.getTimestamp().compareTo(m2.getTimestamp()))
                .map(msg -> {
                    String role = msg.getRole() == ChatMessage.MessageRole.USER ? "학생" : "상담사";
                    return role + ": " + msg.getContent();
                })
                .collect(Collectors.joining("\n\n"));

        log.info("getConversationHistory size={}", session.getMessages().size());
        return history;
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

    /**
     * Python AI 서비스에서 반환된 agentAction Map을 AgentAction DTO로 변환
     */
    @SuppressWarnings("unchecked")
    private AgentAction convertToAgentAction(Object agentActionObj) {
        if (agentActionObj == null) {
            return null;
        }

        try {
            Map<String, Object> actionMap = (Map<String, Object>) agentActionObj;
            log.info("agentAction 맵 키들: {}", actionMap.keySet());
            log.info("agentAction summary 값: {}", actionMap.get("summary"));

            // 액션 버튼 변환
            List<AgentAction.ActionButton> buttons = new ArrayList<>();
            List<Map<String, Object>> actionsList = (List<Map<String, Object>>) actionMap.get("actions");
            if (actionsList != null) {
                for (Map<String, Object> btnMap : actionsList) {
                    AgentAction.ActionButton button = AgentAction.ActionButton.builder()
                            .id((String) btnMap.get("id"))
                            .label((String) btnMap.get("label"))
                            .primary((Boolean) btnMap.get("primary"))
                            .params((Map<String, Object>) btnMap.get("params"))
                            .build();
                    buttons.add(button);
                }
            }

            return AgentAction.builder()
                    .type((String) actionMap.get("type"))
                    .reason((String) actionMap.get("reason"))
                    .summary((String) actionMap.get("summary"))
                    .data((Map<String, Object>) actionMap.get("data"))
                    .actions(buttons)
                    .build();
        } catch (Exception e) {
            log.error("AgentAction 변환 실패: {}", e.getMessage());
            return null;
        }
    }
}
