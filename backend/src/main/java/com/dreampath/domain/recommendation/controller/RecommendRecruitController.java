package com.dreampath.domain.recommendation.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.dreampath.domain.recommendation.dto.RecommendRequest;
import com.dreampath.domain.recommendation.service.RecommendService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/recommend")
public class RecommendRecruitController {

    private final RecommendService recommendService;

    @PostMapping("/worknet")
    public ResponseEntity<?> recommendRecruit(@RequestBody RecommendRequest req) {
        return ResponseEntity.ok(recommendService.recommendWorknet(req.getVectorId()));
    }
}
