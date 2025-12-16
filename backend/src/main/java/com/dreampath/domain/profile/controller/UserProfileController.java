package com.dreampath.domain.profile.controller;

import com.dreampath.domain.profile.dto.UserProfileResponse;
import com.dreampath.domain.profile.entity.UserProfile;
import com.dreampath.domain.profile.repository.UserProfileRepository;
import com.dreampath.global.jwt.JwtUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileRepository userProfileRepository;

    /**
     * 사용자 프로필 조회 API (본인만 가능)
     * 대시보드에서 프로필 정보를 불러올 때 사용
     */
    @GetMapping("/{userId}")
    public UserProfileResponse getProfile(
            @PathVariable Long userId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {

        // 본인 확인
        if (!principal.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "접근 권한이 없습니다.");
        }

        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "프로필을 찾을 수 없습니다. 먼저 AI 상담을 진행해주세요."));

        return UserProfileResponse.from(profile);
    }
}
