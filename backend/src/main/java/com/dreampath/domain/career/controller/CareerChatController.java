package com.dreampath.domain.career.controller;

import com.dreampath.domain.career.dto.ChatRequest;
import com.dreampath.domain.career.dto.ChatResponse;
import com.dreampath.domain.career.dto.IdentityStatus;
import com.dreampath.domain.career.dto.SurveyRequest;
import com.dreampath.domain.career.dto.SurveyResponse;
import com.dreampath.domain.career.service.CareerChatService;
import com.dreampath.domain.career.service.IdentityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * 진로 상담 채팅 API 컨트롤러
 * 
 * 4단계 대화 프로세스를 통한 정체성 확립 채팅 시스템
 */
@Slf4j
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class CareerChatController {

    private final CareerChatService chatService;
    private final IdentityService identityService;

    /**
     * 메시지 전송 및 응답
     * 매 응답마다 실시간 정체성 상태를 포함합니다.
     */
    @PostMapping
    public ResponseEntity<?> chat(@RequestBody ChatRequest request) {
        log.info("대화 요청 받음: sessionId={}, message={}", request.getSessionId(), request.getMessage());

        // userId 필수 검증
        if (request.getUserId() == null || request.getUserId().isBlank()) {
            log.warn("로그인하지 않은 사용자의 대화 시도");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "로그인이 필요합니다."));
        }

        try {
            // 채팅 응답 생성
            ChatResponse response = chatService.chat(request);

            // 세션 조회 (설문조사 완료 여부 확인)
            var session = chatService.getOrCreateSession(request.getSessionId(), request.getUserId());
            boolean surveyCompleted = session.getSurveyCompleted() != null && session.getSurveyCompleted();

            // 설문조사가 완료된 경우에만 정체성 상태 업데이트 (비동기)
            if (surveyCompleted) {
                final String sessionId = response.getSessionId();

                // 정체성 분석을 백그라운드에서 비동기 실행 (채팅 응답 블로킹 방지)
                CompletableFuture.runAsync(() -> {
                    try {
                        log.info("[Async] 정체성 분석 시작: sessionId={}", sessionId);

                        // 단계 진행 확인
                        boolean stageChanged = identityService.shouldProgressToNextStage(sessionId);
                        if (stageChanged) {
                            log.info("[Async] 단계 변경됨: sessionId={}", sessionId);
                        }

                        // 정체성 상태 업데이트
                        String recentMessages = chatService.getRecentMessages(sessionId, 2);
                        IdentityStatus identityStatus = identityService.updateIdentityStatus(sessionId, recentMessages);

                        log.info("[Async] 정체성 분석 완료: sessionId={}, clarity={}",
                                sessionId,
                                identityStatus != null ? identityStatus.getClarity() : null);
                    } catch (Exception e) {
                        log.error("[Async] 정체성 분석 실패: sessionId={}, error={}", sessionId, e.getMessage());
                    }
                });

                // 채팅 응답은 정체성 분석 완료를 기다리지 않고 즉시 반환
                // 프론트엔드는 /api/identity/{sessionId}로 별도 조회 가능
                log.info("채팅 응답 즉시 반환 (정체성 분석은 백그라운드 진행)");
            } else {
                // 설문조사 미완료 시 기본 정체성 상태 반환
                try {
                    IdentityStatus defaultStatus = identityService.getDefaultIdentityStatus(response.getSessionId());
                    response.setIdentityStatus(defaultStatus);
                } catch (Exception e) {
                    log.error("기본 정체성 상태 생성 실패 (무시됨): {}", e.getMessage(), e);
                }
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("대화 처리 중 오류 발생", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of(
                            "error", "대화 처리 중 오류가 발생했습니다.",
                            "message", e.getMessage() != null ? e.getMessage() : "알 수 없는 오류"));
        }
    }

    /**
     * 대화 이력 조회
     */
    @GetMapping("/history/{sessionId}")
    public ResponseEntity<List<ChatResponse>> getHistory(@PathVariable String sessionId) {
        log.info("대화 이력 조회: sessionId={}", sessionId);
        try {
            List<ChatResponse> history = chatService.getSessionHistory(sessionId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            log.error("대화 이력 조회 중 오류 발생", e);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 새 세션 시작
     */
    @PostMapping("/start")
    public ResponseEntity<?> startSession(
            @RequestBody(required = false) Map<String, String> request) {
        log.info("새 세션 시작");

        // userId 필수 검증
        String userId = request != null ? request.get("userId") : null;
        if (userId == null || userId.isBlank()) {
            log.warn("로그인하지 않은 사용자의 세션 시작 시도");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "로그인이 필요합니다."));
        }

        var session = chatService.getOrCreateSession(null, userId);

        // 설문조사 질문 조회
        var surveyResponse = chatService.getSurveyQuestions(session.getSessionId());

        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", session.getSessionId());
        response.put("needsSurvey", surveyResponse.getNeedsSurvey());
        response.put("surveyQuestions", surveyResponse.getQuestions());

        if (surveyResponse.getNeedsSurvey()) {
            response.put("message", "안녕! 나는 너의 진로 정체성을 함께 찾아갈 상담사야. 먼저 간단한 설문조사를 진행해볼까? 😊");
        } else {
            response.put("message", "안녕! 나는 너의 진로 정체성을 함께 찾아갈 상담사야. 편하게 이야기하자 😊");
        }

        return ResponseEntity.ok(response);
    }

    /**
     * 설문조사 질문 조회
     */
    @GetMapping("/survey/{sessionId}")
    public ResponseEntity<SurveyResponse> getSurvey(@PathVariable String sessionId) {
        log.info("설문조사 질문 조회: sessionId={}", sessionId);
        try {
            SurveyResponse response = chatService.getSurveyQuestions(sessionId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("설문조사 질문 조회 중 오류 발생", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 설문조사 응답 제출
     */
    @PostMapping("/survey")
    public ResponseEntity<?> submitSurvey(@RequestBody SurveyRequest request) {
        log.info("설문조사 응답 제출: sessionId={}", request.getSessionId());
        try {
            SurveyResponse response = chatService.submitSurvey(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("설문조사 응답 제출 중 오류 발생", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of(
                            "error", "설문조사 제출 중 오류가 발생했습니다.",
                            "message", e.getMessage() != null ? e.getMessage() : "알 수 없는 오류"));
        }
    }
}
