package com.dreampath.domain.user.controller;

import com.dreampath.domain.user.entity.User;
import com.dreampath.global.exception.ResourceNotFoundException;
import com.dreampath.domain.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
     * 사용자 프로필 조회
     * GET /api/users/{userId}
     */
    @GetMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> getUserProfile(@PathVariable Long userId) {
        log.info("사용자 프로필 조회 - userId: {}", userId);

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
     * 모든 사용자 조회 (디버깅용)
     * GET /api/users
     */
    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        log.info("모든 사용자 조회");
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
     * 사용자 정보 수정
     * PUT /api/users/{userId}
     */
    @PutMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> updateUserProfile(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserRequest request) {
        log.info("사용자 정보 수정 - userId: {}", userId);

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
}
