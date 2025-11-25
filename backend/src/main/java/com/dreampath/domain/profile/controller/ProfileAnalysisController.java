package com.dreampath.domain.profile.controller;

import com.dreampath.domain.profile.dto.ProfileAnalysisResponse;
import com.dreampath.domain.profile.entity.ProfileAnalysis;
import com.dreampath.domain.profile.entity.UserProfile;
import com.dreampath.domain.profile.service.ProfileAnalysisService;
import com.dreampath.domain.profile.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
public class ProfileAnalysisController {

    private final ProfileAnalysisService analysisService;
    private final UserProfileService userProfileService;

    /**
     * 대시보드에서 분석 결과 조회 API
     */
    @GetMapping("/{userId}/analysis")
    public ProfileAnalysisResponse getAnalysis(@PathVariable Long userId) {

        // 1) 프로필 조회
        UserProfile profile = userProfileService.getProfile(userId);

        // 2) 기존 분석 조회
        ProfileAnalysis existing = analysisService.findByUserId(userId);
        if (existing != null) {
            return ProfileAnalysisResponse.from(existing);
        }

        // 3) 분석이 없으면 자동 생성 후 반환
        ProfileAnalysis created = analysisService.generateAnalysis(profile);
        return ProfileAnalysisResponse.from(created);
    }
}
