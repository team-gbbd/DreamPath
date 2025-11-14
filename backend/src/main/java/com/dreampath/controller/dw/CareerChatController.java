package com.dreampath.controller.dw;

import com.dreampath.dto.dw.ChatRequest;
import com.dreampath.dto.dw.ChatResponse;
import com.dreampath.dto.dw.IdentityStatus;
import com.dreampath.service.dw.CareerChatService;
import com.dreampath.service.dw.IdentityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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
        try {
            // 채팅 응답 생성
            ChatResponse response = chatService.chat(request);
            
            // 단계 진행 확인 (백그라운드)
            boolean stageChanged = identityService.shouldProgressToNextStage(response.getSessionId());
            response.setStageChanged(stageChanged);
            
            // 실시간 정체성 상태 조회
            try {
                String recentMessages = chatService.getRecentMessages(response.getSessionId(), 2);
                IdentityStatus identityStatus = identityService.updateIdentityStatus(
                    response.getSessionId(), 
                    recentMessages
                );
                response.setIdentityStatus(identityStatus);
                
                if (stageChanged) {
                    log.info("단계 변경됨: {} -> {}", 
                        identityStatus.getCurrentStage(), 
                        identityStatus.getCurrentStage());
                }
            } catch (Exception e) {
                log.warn("정체성 상태 업데이트 실패 (무시됨): {}", e.getMessage());
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("대화 처리 중 오류 발생", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of(
                            "error", "대화 처리 중 오류가 발생했습니다.",
                            "message", e.getMessage() != null ? e.getMessage() : "알 수 없는 오류"
                    ));
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
    public ResponseEntity<Map<String, String>> startSession(
            @RequestBody(required = false) Map<String, String> request) {
        log.info("새 세션 시작");
        String userId = request != null ? request.get("userId") : null;
        var session = chatService.getOrCreateSession(null, userId);
        return ResponseEntity.ok(Map.of(
                "sessionId", session.getSessionId(),
                "message", "안녕! 나는 너의 진로 정체성을 함께 찾아갈 상담사야. 편하게 이야기하자 😊"
        ));
    }
}
