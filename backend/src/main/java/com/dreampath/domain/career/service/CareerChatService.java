package com.dreampath.domain.career.service;

import com.dreampath.domain.career.dto.AgentAction;
import com.dreampath.domain.career.dto.ChatRequest;
import com.dreampath.domain.career.dto.ChatResponse;
import com.dreampath.domain.career.dto.SurveyRequest;
import com.dreampath.domain.career.dto.SurveyResponse;
import com.dreampath.domain.career.entity.CareerSession;
import com.dreampath.domain.career.entity.ChatMessage;
import com.dreampath.domain.career.repository.CareerSessionRepository;
import com.dreampath.domain.career.repository.ChatMessageRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.Arrays;
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
    private final TransactionTemplate txTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatResponse chat(ChatRequest request) {
        log.info("채팅 요청 - 세션: {}, 사용자: {}", request.getSessionId(), request.getUserId());

        // 1단계: 세션 조회 및 사용자 메시지 저장 (트랜잭션 1)
        ChatContext context = txTemplate.execute(status -> {
            CareerSession session = getOrCreateSession(request.getSessionId(), request.getUserId());

            ChatContext ctx = new ChatContext();
            ctx.sessionId = session.getSessionId();

            if (session.getSurveyCompleted() == null || !session.getSurveyCompleted()) {
                ctx.surveyIncomplete = true;
                return ctx;
            }

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

            if (session.getSurveyData() != null) {
                try {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> parsed = objectMapper.readValue(session.getSurveyData(), Map.class);
                    ctx.surveyData = parsed;
                } catch (Exception e) {
                    log.warn("설문조사 데이터 파싱 실패: {}", e.getMessage());
                }
            }

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

            return ctx;
        });

        if (context.surveyIncomplete) {
            return ChatResponse.builder()
                    .sessionId(context.sessionId)
                    .message("먼저 간단한 설문조사를 진행해주세요. 설문조사는 /api/chat/survey 엔드포인트를 통해 제출할 수 있습니다.")
                    .role("assistant")
                    .timestamp(System.currentTimeMillis())
                    .build();
        }

        // 2단계: AI 서비스 호출 (트랜잭션 없음)
        Map<String, Object> aiResult = pythonChatService.generateChatResponse(
            context.sessionId,
            request.getMessage(),
            context.currentStage,
            context.conversationHistory,
            context.surveyData,
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

            log.info("응답 생성 완료 - 세션: {}, 단계: {}, 메시지 수: {}, 에이전트액션: {}",
                session.getSessionId(),
                session.getCurrentStage().getDisplayName(),
                session.getStageMessageCount(),
                agentAction != null ? agentAction.getType() : "없음");

            String taskId = (String) aiResult.get("taskId");

            return ChatResponse.builder()
                    .sessionId(session.getSessionId())
                    .message(aiResponse)
                    .role("assistant")
                    .timestamp(System.currentTimeMillis())
                    .agentAction(agentAction)
                    .taskId(taskId)
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
        Map<String, Object> surveyData;
        Long userIdLong;
        Map<String, Object> identityStatusMap;
        boolean surveyIncomplete = false;
    }

    public CareerSession getOrCreateSession(String sessionId, String userId) {
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
    
    /**
     * 설문조사 질문 조회
     */
    @Transactional(readOnly = true)
    public SurveyResponse getSurveyQuestions(String sessionId) {
        CareerSession session = sessionRepository.findBySessionId(sessionId)
                .orElseGet(() -> {
                    // 세션이 없으면 새로 생성
                    String userId = null; // 세션 ID만으로는 userId를 알 수 없음
                    return createNewSession(userId);
                });
        
        // 이미 설문조사를 완료했다면
        if (session.getSurveyCompleted() != null && session.getSurveyCompleted()) {
            return SurveyResponse.builder()
                    .needsSurvey(false)
                    .completed(true)
                    .sessionId(session.getSessionId())
                    .questions(List.of())
                    .build();
        }
        
        // 설문조사 질문 생성
        List<SurveyResponse.SurveyQuestion> questions = Arrays.asList(
                SurveyResponse.SurveyQuestion.builder()
                        .id("name")
                        .question("이름을 알려주세요 (선택사항)")
                        .type("text")
                        .required(false)
                        .build(),
                SurveyResponse.SurveyQuestion.builder()
                        .id("age")
                        .question("나이를 입력해주세요 (숫자만 입력)")
                        .type("text")
                        .required(true)
                        .build(),
                SurveyResponse.SurveyQuestion.builder()
                        .id("interests")
                        .question("관심 있는 분야를 선택해주세요 (여러 개 선택 가능)")
                        .type("multiselect")
                        .options(Arrays.asList(
                                "프로그래밍", "디자인", "음악", "미술", "스포츠", 
                                "언어", "과학", "수학", "문학", "경영", "의료", "교육", "기타"
                        ))
                        .required(false)
                        .build(),
                SurveyResponse.SurveyQuestion.builder()
                        .id("favoriteSubjects")
                        .question("좋아하는 과목을 선택해주세요 (여러 개 선택 가능)")
                        .type("multiselect")
                        .options(Arrays.asList(
                                "국어", "영어", "수학", "사회", "과학", "체육", 
                                "음악", "미술", "기술", "가정", "정보", "기타"
                        ))
                        .required(false)
                        .build(),
                SurveyResponse.SurveyQuestion.builder()
                        .id("difficultSubjects")
                        .question("어려워하거나 싫어하는 과목을 선택해주세요 (여러 개 선택 가능, 선택사항)")
                        .type("multiselect")
                        .options(Arrays.asList(
                                "국어", "영어", "수학", "사회", "과학", "체육", 
                                "음악", "미술", "기술", "가정", "정보", "없음"
                        ))
                        .required(false)
                        .build(),
                SurveyResponse.SurveyQuestion.builder()
                        .id("hasDreamCareer")
                        .question("장래 희망이 있나요?")
                        .type("select")
                        .options(Arrays.asList("있음", "없음", "모호함"))
                        .required(false)
                        .build(),
                SurveyResponse.SurveyQuestion.builder()
                        .id("careerPressure")
                        .question("진로 결정에 대한 압박감을 느끼나요?")
                        .type("select")
                        .options(Arrays.asList("높음", "보통", "낮음"))
                        .required(false)
                        .build(),
                SurveyResponse.SurveyQuestion.builder()
                        .id("concern")
                        .question("현재 진로에 대한 고민이 있다면 간단히 적어주세요 (선택사항)")
                        .type("text")
                        .required(false)
                        .build()
        );
        
        return SurveyResponse.builder()
                .needsSurvey(true)
                .completed(false)
                .sessionId(session.getSessionId())
                .questions(questions)
                .build();
    }
    
    /**
     * 설문조사 응답 저장
     */
    @Transactional
    public SurveyResponse submitSurvey(SurveyRequest request) {
        CareerSession session = sessionRepository.findBySessionId(request.getSessionId())
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
        
        // 설문조사 데이터를 JSON으로 변환
        Map<String, Object> surveyData = new HashMap<>();
        surveyData.put("name", request.getName());
        surveyData.put("age", request.getAge());
        surveyData.put("interests", request.getInterests());
        surveyData.put("favoriteSubjects", request.getFavoriteSubjects());
        surveyData.put("difficultSubjects", request.getDifficultSubjects());
        surveyData.put("hasDreamCareer", request.getHasDreamCareer());
        surveyData.put("careerPressure", request.getCareerPressure());
        surveyData.put("concern", request.getConcern());
        
        try {
            String surveyDataJson = objectMapper.writeValueAsString(surveyData);
            session.setSurveyData(surveyDataJson);
            session.setSurveyCompleted(true);
            sessionRepository.save(session);
            
            log.info("설문조사 완료 - 세션: {}, 나이: {}", session.getSessionId(), request.getAge());
            
            return SurveyResponse.builder()
                    .needsSurvey(false)
                    .completed(true)
                    .sessionId(session.getSessionId())
                    .questions(List.of())
                    .build();
        } catch (JsonProcessingException e) {
            log.error("설문조사 데이터 저장 실패", e);
            throw new RuntimeException("설문조사 데이터 저장 실패: " + e.getMessage(), e);
        }
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
