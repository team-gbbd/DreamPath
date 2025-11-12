package com.dreampath.controller.dw;

import com.dreampath.dto.dw.ChatRequest;
import com.dreampath.dto.dw.ChatResponse;
import com.dreampath.service.dw.CareerChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class CareerChatController {

    private final CareerChatService chatService;

    @PostMapping
    public ResponseEntity<?> chat(@RequestBody ChatRequest request) {
        log.info("대화 요청 받음: sessionId={}, message={}", request.getSessionId(), request.getMessage());
        try {
            ChatResponse response = chatService.chat(request);
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

    @PostMapping("/start")
    public ResponseEntity<Map<String, String>> startSession(@RequestBody(required = false) Map<String, String> request) {
        log.info("새 세션 시작");
        String userId = request != null ? request.get("userId") : null;
        var session = chatService.getOrCreateSession(null, userId);
        return ResponseEntity.ok(Map.of(
                "sessionId", session.getSessionId(),
                "message", "안녕하세요! 진로 상담을 시작하겠습니다. 편하게 이야기해주세요."
        ));
    }
}

