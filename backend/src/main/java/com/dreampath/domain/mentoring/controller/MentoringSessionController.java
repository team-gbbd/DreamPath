package com.dreampath.domain.mentoring.controller;

import com.dreampath.domain.mentoring.dto.mentoring.MentoringSessionRequest;
import com.dreampath.domain.mentoring.dto.mentoring.MentoringSessionResponse;
import com.dreampath.domain.mentoring.service.MentoringSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 멘토링 세션 관련 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/mentoring-sessions")
@RequiredArgsConstructor
public class MentoringSessionController {

    private final MentoringSessionService sessionService;

    /**
     * 멘토링 세션 생성
     * POST /api/mentoring-sessions
     */
    @PostMapping
    public ResponseEntity<MentoringSessionResponse> createSession(
            @Valid @RequestBody MentoringSessionRequest request) {
        log.info("멘토링 세션 생성 API - mentorId: {}, title: {}", request.getMentorId(), request.getTitle());

        MentoringSessionResponse response = sessionService.createSession(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 멘토링 세션 수정
     * PUT /api/mentoring-sessions/{sessionId}
     */
    @PutMapping("/{sessionId}")
    public ResponseEntity<MentoringSessionResponse> updateSession(
            @PathVariable Long sessionId,
            @Valid @RequestBody MentoringSessionRequest request) {
        log.info("멘토링 세션 수정 API - sessionId: {}", sessionId);

        MentoringSessionResponse response = sessionService.updateSession(sessionId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 멘토링 세션 비활성화
     * DELETE /api/mentoring-sessions/{sessionId}
     */
    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Void> deactivateSession(@PathVariable Long sessionId) {
        log.info("멘토링 세션 비활성화 API - sessionId: {}", sessionId);

        sessionService.deactivateSession(sessionId);
        return ResponseEntity.ok().build();
    }

    /**
     * 특정 멘토의 모든 세션 조회
     * GET /api/mentoring-sessions/mentor/{mentorId}
     */
    @GetMapping("/mentor/{mentorId}")
    public ResponseEntity<List<MentoringSessionResponse>> getMentorSessions(@PathVariable Long mentorId) {
        log.info("멘토 세션 목록 조회 API - mentorId: {}", mentorId);

        List<MentoringSessionResponse> responses = sessionService.getMentorSessions(mentorId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 활성화된 모든 세션 조회 (학생용)
     * GET /api/mentoring-sessions/available
     */
    @GetMapping("/available")
    public ResponseEntity<List<MentoringSessionResponse>> getAvailableSessions() {
        log.info("활성화된 세션 목록 조회 API");

        List<MentoringSessionResponse> responses = sessionService.getAvailableSessions();
        return ResponseEntity.ok(responses);
    }

    /**
     * 세션 상세 조회
     * GET /api/mentoring-sessions/{sessionId}
     */
    @GetMapping("/{sessionId}")
    public ResponseEntity<MentoringSessionResponse> getSession(@PathVariable Long sessionId) {
        log.info("세션 상세 조회 API - sessionId: {}", sessionId);

        MentoringSessionResponse response = sessionService.getSession(sessionId);
        return ResponseEntity.ok(response);
    }
}
