package com.dreampath.controller.dw;

import com.dreampath.dto.dw.AnalysisResponse;
import com.dreampath.service.dw.CareerAnalysisService;
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
}

