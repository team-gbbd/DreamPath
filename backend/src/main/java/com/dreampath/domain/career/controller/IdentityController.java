package com.dreampath.domain.career.controller;

import com.dreampath.domain.career.dto.IdentityStatus;
import com.dreampath.domain.career.service.IdentityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 실시간 정체성 API 컨트롤러
 * 
 * 대화 중 학생의 진로 정체성 상태를 실시간으로 조회합니다.
 */
@Slf4j
@RestController
@RequestMapping("/api/identity")
@RequiredArgsConstructor
public class IdentityController {

    private final IdentityService identityService;

    /**
     * 현재 정체성 상태 조회
     */
    @GetMapping("/{sessionId}")
    public ResponseEntity<IdentityStatus> getIdentityStatus(@PathVariable String sessionId) {
        log.info("정체성 상태 조회 요청: sessionId={}", sessionId);
        try {
            IdentityStatus status = identityService.getIdentityStatus(sessionId);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            log.error("정체성 상태 조회 실패", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 다음 단계 진행 확인
     */
    @PostMapping("/{sessionId}/progress")
    public ResponseEntity<Boolean> checkStageProgress(@PathVariable String sessionId) {
        log.info("단계 진행 체크: sessionId={}", sessionId);
        try {
            boolean progressed = identityService.shouldProgressToNextStage(sessionId);
            return ResponseEntity.ok(progressed);
        } catch (Exception e) {
            log.error("단계 진행 체크 실패", e);
            return ResponseEntity.ok(false);
        }
    }
}

