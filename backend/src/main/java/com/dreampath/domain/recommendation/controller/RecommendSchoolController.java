package com.dreampath.domain.recommendation.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.dreampath.domain.recommendation.dto.RecommendRequest;
import com.dreampath.domain.recommendation.service.RecommendService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/recommend")
public class RecommendSchoolController {

    private final RecommendService recommendService;

    @PostMapping("/schools")
    public ResponseEntity<?> recommendSchool(@RequestBody RecommendRequest req) {
        return ResponseEntity.ok(recommendService.recommendSchool(req.getVectorId()));
    }
}
