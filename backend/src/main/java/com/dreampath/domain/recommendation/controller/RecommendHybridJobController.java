package com.dreampath.domain.recommendation.controller;

import com.dreampath.domain.recommendation.service.RecommendService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/recommend")
public class RecommendHybridJobController {

    private final RecommendService recommendService;

    @GetMapping("/hybrid")
    public ResponseEntity<?> recommendHybridJob(
            @RequestParam String vectorId,
            @RequestParam(defaultValue = "20") int topK) {

        Map<String, Object> result = recommendService.recommendHybridJob(vectorId, topK);
        return ResponseEntity.ok(result);
    }
}
