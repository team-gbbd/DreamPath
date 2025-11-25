package com.dreampath.domain.career.controller;

import com.dreampath.domain.career.dto.AnalysisResponse;
import com.dreampath.domain.career.service.CareerAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/analysis")
@RequiredArgsConstructor
public class CareerAnalysisController {

    private final CareerAnalysisService analysisService;

    /**
     * 세션 분석 수행
     */
    @PostMapping("/{sessionId}")
    public ResponseEntity<?> analyzeSession(@PathVariable String sessionId) {
        log.info("세션 분석 요청: sessionId={}", sessionId);
        try {
            AnalysisResponse analysis = analysisService.analyzeSession(sessionId);
            return ResponseEntity.ok(analysis);
        } catch (IllegalArgumentException e) {
            log.error("잘못된 요청: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of(
                            "error", "잘못된 요청입니다.",
                            "message", e.getMessage()
                    ));
        } catch (Exception e) {
            log.error("분석 중 오류 발생", e);
            return ResponseEntity.internalServerError()
                    .body(java.util.Map.of(
                            "error", "분석 중 오류가 발생했습니다.",
                            "message", e.getMessage() != null ? e.getMessage() : "알 수 없는 오류"
                    ));
        }
    }
    
    /**
     * 분석 결과 조회
     */
    @GetMapping("/{sessionId}")
    public ResponseEntity<?> getAnalysis(@PathVariable String sessionId) {
        log.info("분석 결과 조회 요청: sessionId={}", sessionId);
        try {
            AnalysisResponse analysis = analysisService.getAnalysis(sessionId);
            return ResponseEntity.ok(analysis);
        } catch (RuntimeException e) {
            log.warn("분석 결과를 찾을 수 없음: sessionId={}, error={}", sessionId, e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("분석 결과 조회 중 오류 발생", e);
            return ResponseEntity.internalServerError()
                    .body(java.util.Map.of(
                            "error", "분석 결과 조회 중 오류가 발생했습니다.",
                            "message", e.getMessage() != null ? e.getMessage() : "알 수 없는 오류"
                    ));
        }
    }
}

