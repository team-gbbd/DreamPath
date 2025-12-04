package com.dreampath.domain.recommendation.controller;

import com.dreampath.domain.recommendation.dto.RecommendRequest;
import com.dreampath.domain.recommendation.service.RecommendService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/recommend")
public class RecommendCounselController {

    private final RecommendService recommendService;

    @PostMapping("/counsel")
    public ResponseEntity<?> recommendCounsel(@RequestBody RecommendRequest req) {
        return ResponseEntity.ok(recommendService.recommendCounsel(req.getVectorId()));
    }
}
