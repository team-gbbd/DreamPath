package com.dreampath.domain.career.service;

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
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public ChatResponse chat(ChatRequest request) {
        log.info("채팅 요청 - 세션: {}, 사용자: {}", request.getSessionId(), request.getUserId());

        // 세션 찾기 또는 생성
        CareerSession session = getOrCreateSession(request.getSessionId(), request.getUserId());

        // 설문조사가 완료되지 않았다면 설문조사 완료 요청 메시지 반환
        // (정체성 상태는 컨트롤러에서 처리)
        if (session.getSurveyCompleted() == null || !session.getSurveyCompleted()) {
            return ChatResponse.builder()
                    .sessionId(session.getSessionId())
                    .message("먼저 간단한 설문조사를 진행해주세요. 설문조사는 /api/chat/survey 엔드포인트를 통해 제출할 수 있습니다.")
                    .role("assistant")
                    .timestamp(System.currentTimeMillis())
                    .build();
        }
        
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

        // 대화 이력을 Python AI 서비스 형식으로 변환
        List<Map<String, String>> conversationHistory = session.getMessages().stream()
                .map(msg -> {
                    Map<String, String> message = new HashMap<>();
                    message.put("role", msg.getRole().name());
                    message.put("content", msg.getContent());
                    return message;
                })
                .collect(Collectors.toList());
        
        // 설문조사 정보 파싱
        Map<String, Object> surveyData = null;
        if (session.getSurveyData() != null) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> parsed = objectMapper.readValue(session.getSurveyData(), Map.class);
                surveyData = parsed;
            } catch (Exception e) {
                log.warn("설문조사 데이터 파싱 실패: {}", e.getMessage());
            }
        }

        // Python AI 서비스의 LangChain을 통해 응답 생성
        String aiResponse = pythonChatService.generateChatResponse(
            session.getSessionId(),
            request.getMessage(),
            session.getCurrentStage().name(),
            conversationHistory,
            surveyData
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

        // 🚀 세션이 없으면 그냥 빈 리스트 반환 (오류 X)
        CareerSession session = sessionRepository.findBySessionId(sessionId)
                .orElse(null);

        if (session == null) {
            return List.of(); // 빈 배열 반환
        }

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
}
