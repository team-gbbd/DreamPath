package com.dreampath.domain.profile.controller;

import com.dreampath.domain.profile.dto.ProfileAnalysisResponse;
import com.dreampath.domain.profile.entity.ProfileAnalysis;
import com.dreampath.domain.profile.service.ProfileAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
public class ProfileAnalysisController {

    private final ProfileAnalysisService analysisService;

    /**
     * 대시보드에서 분석 결과 조회 API
     */
    @GetMapping("/{userId}/analysis")
    public ProfileAnalysisResponse getAnalysis(@PathVariable Long userId) {

        ProfileAnalysis existing = analysisService.findByUserId(userId);
        if (existing != null) {
            return ProfileAnalysisResponse.from(existing);
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "성향 분석 결과가 없습니다. AI 분석을 먼저 실행해주세요.");
    }
}
