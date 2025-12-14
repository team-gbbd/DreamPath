package com.dreampath.domain.user.controller;

import com.dreampath.domain.user.dto.user.UpdateUserRequest;
import com.dreampath.domain.user.dto.user.UserProfileResponse;
import com.dreampath.domain.user.entity.User;
import com.dreampath.global.enums.Role;
import com.dreampath.global.exception.ResourceNotFoundException;
import com.dreampath.global.jwt.JwtUserPrincipal;
import com.dreampath.domain.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * 사용자 정보 관련 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    /**
     * 사용자 프로필 조회 (본인만 조회 가능)
     * GET /api/users/{userId}
     */
    @GetMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> getUserProfile(
            @PathVariable Long userId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("사용자 프로필 조회 - userId: {}", userId);

        validateOwnership(principal, userId);

        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

            log.info("사용자 조회 완료 - username: {}", user.getUsername());
            UserProfileResponse response = UserProfileResponse.from(user);
            log.info("UserProfileResponse 생성 완료");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("사용자 프로필 조회 중 에러 발생", e);
            throw e;
        }
    }

    /**
     * 모든 사용자 조회 (관리자 전용)
     * GET /api/users
     */
    @GetMapping
    public ResponseEntity<?> getAllUsers(@AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("모든 사용자 조회");

        validateAdmin(principal);

        try {
            var users = userRepository.findAll();
            log.info("사용자 수: {}", users.size());
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            log.error("사용자 조회 실패", e);
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    /**
     * 사용자 정보 수정 (본인만 가능)
     * PUT /api/users/{userId}
     */
    @PutMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> updateUserProfile(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("사용자 정보 수정 - userId: {}", userId);

        validateOwnership(principal, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // 정보 수정
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setBirth(request.getBirth());

        User updatedUser = userRepository.save(user);
        log.info("사용자 정보 수정 완료 - userId: {}", userId);

        return ResponseEntity.ok(UserProfileResponse.from(updatedUser));
    }

    /**
     * 사용자 역할 변경 (관리자 전용)
     * PATCH /api/users/{userId}/role
     */
    @PatchMapping("/{userId}/role")
    public ResponseEntity<?> updateUserRole(
            @PathVariable Long userId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("사용자 역할 변경 - userId: {}, role: {}", userId, request.get("role"));

        validateAdmin(principal);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        String roleStr = request.get("role");
        try {
            Role role = Role.valueOf(roleStr);
            user.setRole(role);
            User updatedUser = userRepository.save(user);
            log.info("사용자 역할 변경 완료 - userId: {}, role: {}", userId, role);
            return ResponseEntity.ok(updatedUser);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid role: " + roleStr);
        }
    }

    /**
     * 사용자 활성화/비활성화 (관리자 전용)
     * PATCH /api/users/{userId}/status
     */
    @PatchMapping("/{userId}/status")
    public ResponseEntity<?> updateUserStatus(
            @PathVariable Long userId,
            @RequestBody Map<String, Boolean> request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("사용자 상태 변경 - userId: {}, isActive: {}", userId, request.get("isActive"));

        validateAdmin(principal);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Boolean isActive = request.get("isActive");
        if (isActive == null) {
            return ResponseEntity.badRequest().body("isActive is required");
        }

        user.setIsActive(isActive);
        User updatedUser = userRepository.save(user);
        log.info("사용자 상태 변경 완료 - userId: {}, isActive: {}", userId, isActive);

        return ResponseEntity.ok(updatedUser);
    }

    /**
     * 본인 확인 헬퍼 메서드
     */
    private void validateOwnership(JwtUserPrincipal principal, Long userId) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        if (!principal.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "접근 권한이 없습니다.");
        }
    }

    /**
     * 관리자 확인 헬퍼 메서드
     */
    private void validateAdmin(JwtUserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        if (!"ADMIN".equals(principal.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자 권한이 필요합니다.");
        }
    }
}
