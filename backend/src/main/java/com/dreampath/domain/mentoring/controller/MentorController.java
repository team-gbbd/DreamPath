package com.dreampath.domain.mentoring.controller;

import com.dreampath.domain.mentoring.dto.mentor.ApproveRejectRequest;
import com.dreampath.domain.mentoring.dto.mentor.MentorApplicationRequest;
import com.dreampath.domain.mentoring.dto.mentor.MentorResponse;
import com.dreampath.global.enums.MentorStatus;
import com.dreampath.domain.mentoring.service.MentorService;
import com.dreampath.global.jwt.JwtUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 멘토 신청 관련 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/mentors")
@RequiredArgsConstructor
public class MentorController {

    private final MentorService mentorService;

    /**
     * 멘토 신청
     * POST /api/mentors/apply
     */
    @PostMapping("/apply")
    public ResponseEntity<MentorResponse> applyForMentor(
            @Valid @RequestBody MentorApplicationRequest request) {
        log.info("멘토 신청 API 호출 - userId: {}", request.getUserId());

        MentorResponse response = mentorService.applyForMentor(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 내 멘토 신청 상태 조회
     * GET /api/mentors/my-application/{userId}
     * 멘토 신청이 없는 경우 204 No Content 반환
     */
    @GetMapping("/my-application/{userId}")
    public ResponseEntity<MentorResponse> getMyMentorApplication(@PathVariable Long userId) {
        log.info("멘토 신청 상태 조회 API - userId: {}", userId);

        MentorResponse response = mentorService.getMyMentorApplication(userId);

        if (response == null) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(response);
    }

    /**
     * 모든 멘토 신청 목록 조회 (관리자용)
     * GET /api/mentors/applications
     */
    @GetMapping("/applications")
    public ResponseEntity<List<MentorResponse>> getAllMentorApplications(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("모든 멘토 신청 목록 조회 API (관리자) - userId: {}", principal.getUserId());

        // ADMIN 권한 검증
        if (!"ADMIN".equals(principal.getRole())) {
            throw new RuntimeException("관리자 권한이 필요합니다.");
        }

        List<MentorResponse> responses = mentorService.getAllMentorApplications();
        return ResponseEntity.ok(responses);
    }

    /**
     * 상태별 멘토 신청 목록 조회 (관리자용)
     * GET /api/mentors/applications/status/{status}
     */
    @GetMapping("/applications/status/{status}")
    public ResponseEntity<List<MentorResponse>> getMentorApplicationsByStatus(
            @PathVariable MentorStatus status,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("멘토 신청 목록 조회 API - status: {}, userId: {}", status, principal.getUserId());

        // ADMIN 권한 검증
        if (!"ADMIN".equals(principal.getRole())) {
            throw new RuntimeException("관리자 권한이 필요합니다.");
        }

        List<MentorResponse> responses = mentorService.getMentorApplicationsByStatus(status);
        return ResponseEntity.ok(responses);
    }

    /**
     * 멘토 신청 승인/거절 (관리자용)
     * PATCH /api/mentors/applications/{mentorId}/review
     */
    @PatchMapping("/applications/{mentorId}/review")
    public ResponseEntity<MentorResponse> reviewMentorApplication(
            @PathVariable Long mentorId,
            @Valid @RequestBody ApproveRejectRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("멘토 신청 심사 API - mentorId: {}, approve: {}, adminId: {}",
                mentorId, request.getApprove(), principal.getUserId());

        // ADMIN 권한 검증
        if (!"ADMIN".equals(principal.getRole())) {
            throw new RuntimeException("관리자 권한이 필요합니다.");
        }

        Long reviewerId = principal.getUserId();

        MentorResponse response;
        if (request.getApprove()) {
            response = mentorService.approveMentorApplication(mentorId, reviewerId, request.getReason());
        } else {
            if (request.getReason() == null || request.getReason().isBlank()) {
                throw new RuntimeException("거절 시 사유는 필수입니다.");
            }
            response = mentorService.rejectMentorApplication(mentorId, reviewerId, request.getReason());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * 승인된 멘토 목록 조회
     * GET /api/mentors/approved
     */
    @GetMapping("/approved")
    public ResponseEntity<List<MentorResponse>> getApprovedMentors() {
        log.info("승인된 멘토 목록 조회 API");

        List<MentorResponse> responses = mentorService.getApprovedMentors();
        return ResponseEntity.ok(responses);
    }

    /**
     * 멘토 상세 정보 조회
     * GET /api/mentors/{mentorId}
     */
    @GetMapping("/{mentorId}")
    public ResponseEntity<MentorResponse> getMentorDetail(@PathVariable Long mentorId) {
        log.info("멘토 상세 조회 API - mentorId: {}", mentorId);

        MentorResponse response = mentorService.getMentorDetail(mentorId);
        return ResponseEntity.ok(response);
    }

    /**
     * 멘토 프로필 수정
     * PUT /api/mentors/{mentorId}
     */
    @PutMapping("/{mentorId}")
    public ResponseEntity<MentorResponse> updateMentorProfile(
            @PathVariable Long mentorId,
            @Valid @RequestBody MentorApplicationRequest request) {
        log.info("멘토 프로필 수정 API - mentorId: {}", mentorId);

        MentorResponse response = mentorService.updateMentorProfile(mentorId, request);
        return ResponseEntity.ok(response);
    }

}
