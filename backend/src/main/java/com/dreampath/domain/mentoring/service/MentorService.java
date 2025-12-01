package com.dreampath.domain.mentoring.service;

import com.dreampath.domain.mentoring.dto.mentor.MentorApplicationRequest;
import com.dreampath.domain.mentoring.dto.mentor.MentorResponse;
import com.dreampath.domain.mentoring.entity.Mentor;
import com.dreampath.domain.mentoring.entity.MentorApprovalLog;
import com.dreampath.domain.user.entity.User;
import com.dreampath.global.enums.MentorStatus;
import com.dreampath.global.enums.Role;
import com.dreampath.global.exception.ResourceNotFoundException;
import com.dreampath.domain.mentoring.repository.MentorApprovalLogRepository;
import com.dreampath.domain.mentoring.repository.MentorRepository;
import com.dreampath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MentorService {

    private final MentorRepository mentorRepository;
    private final UserRepository userRepository;
    private final MentorApprovalLogRepository approvalLogRepository;

    /**
     * 멘토 신청
     */
    @Transactional
    public MentorResponse applyForMentor(MentorApplicationRequest request) {
        log.info("멘토 신청 - userId: {}", request.getUserId());

        if (request.getUserId() == null) {
            throw new RuntimeException("사용자 ID는 필수입니다.");
        }
        if (request.getCompany() == null || request.getCompany().isBlank()) {
            throw new RuntimeException("회사명은 필수입니다.");
        }
        if (request.getJob() == null || request.getJob().isBlank()) {
            throw new RuntimeException("직업은 필수입니다.");
        }
        if (request.getExperience() == null || request.getExperience().isBlank()) {
            throw new RuntimeException("경력은 필수입니다.");
        }
        if (request.getBio() == null || request.getBio().isBlank()) {
            throw new RuntimeException("자기소개는 필수입니다.");
        }
        if (request.getCareer() == null || request.getCareer().isBlank()) {
            throw new RuntimeException("경력 상세는 필수입니다.");
        }

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getUserId()));

        // 이미 신청했는지 확인
        if (mentorRepository.existsByUser(user)) {
            throw new RuntimeException("이미 멘토 신청을 하셨습니다.");
        }

        Mentor mentor = new Mentor();
        mentor.setUser(user);
        mentor.setCompany(request.getCompany());
        mentor.setJob(request.getJob());
        mentor.setExperience(request.getExperience());
        mentor.setBio(request.getBio());
        mentor.setCareer(request.getCareer());
        mentor.setAvailableTime(request.getAvailableTime());
        mentor.setStatus(MentorStatus.PENDING);

        Mentor savedMentor = mentorRepository.save(mentor);
        log.info("멘토 신청 완료 - mentorId: {}", savedMentor.getMentorId());

        return MentorResponse.from(savedMentor);
    }

    /**
     * 멘토 신청 상태 조회 (본인)
     * 멘토 신청이 없는 경우 null 반환 (404 에러를 던지지 않음)
     */
    public MentorResponse getMyMentorApplication(Long userId) {
        log.info("멘토 신청 상태 조회 - userId: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        return mentorRepository.findByUser(user)
                .map(MentorResponse::from)
                .orElse(null);
    }

    /**
     * 모든 멘토 신청 목록 조회 (관리자용)
     */
    public List<MentorResponse> getAllMentorApplications() {
        log.info("모든 멘토 신청 목록 조회");

        return mentorRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(MentorResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 상태별 멘토 신청 목록 조회 (관리자용)
     */
    public List<MentorResponse> getMentorApplicationsByStatus(MentorStatus status) {
        log.info("멘토 신청 목록 조회 - status: {}", status);

        return mentorRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(MentorResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 멘토 신청 승인 (관리자)
     */
    @Transactional
    public MentorResponse approveMentorApplication(Long mentorId, Long adminId, String reason) {
        log.info("멘토 신청 승인 - mentorId: {}, adminId: {}", mentorId, adminId);

        Mentor mentor = mentorRepository.findById(mentorId)
                .orElseThrow(() -> new ResourceNotFoundException("Mentor", "id", mentorId));

        if (mentor.getStatus() != MentorStatus.PENDING) {
            throw new RuntimeException("대기 중인 신청만 승인할 수 있습니다.");
        }

        String previousStatus = mentor.getStatus().name();

        // 멘토 상태 변경
        mentor.setStatus(MentorStatus.APPROVED);

        // 사용자 권한도 MENTOR로 변경 (필요시)
        // User user = mentor.getUser();
        // user.setRole(Role.MENTOR);
        // userRepository.save(user);

        Mentor savedMentor = mentorRepository.save(mentor);

        // 승인 로그 저장
        MentorApprovalLog log = new MentorApprovalLog();
        log.setMentor(mentor);
        log.setApprovedBy(adminId);
        log.setPreviousStatus(previousStatus);
        log.setNewStatus(MentorStatus.APPROVED.name());
        log.setReason(reason);
        approvalLogRepository.save(log);

        this.log.info("멘토 신청 승인 완료 - mentorId: {}", mentorId);

        return MentorResponse.from(savedMentor);
    }

    /**
     * 멘토 신청 거절 (관리자)
     */
    @Transactional
    public MentorResponse rejectMentorApplication(Long mentorId, Long adminId, String reason) {
        log.info("멘토 신청 거절 - mentorId: {}, adminId: {}", mentorId, adminId);

        Mentor mentor = mentorRepository.findById(mentorId)
                .orElseThrow(() -> new ResourceNotFoundException("Mentor", "id", mentorId));

        if (mentor.getStatus() != MentorStatus.PENDING) {
            throw new RuntimeException("대기 중인 신청만 거절할 수 있습니다.");
        }

        String previousStatus = mentor.getStatus().name();

        // 멘토 상태 변경
        mentor.setStatus(MentorStatus.REJECTED);

        Mentor savedMentor = mentorRepository.save(mentor);

        // 거절 로그 저장
        MentorApprovalLog log = new MentorApprovalLog();
        log.setMentor(mentor);
        log.setApprovedBy(adminId);
        log.setPreviousStatus(previousStatus);
        log.setNewStatus(MentorStatus.REJECTED.name());
        log.setReason(reason != null ? reason : "승인 기준 미달");
        approvalLogRepository.save(log);

        this.log.info("멘토 신청 거절 완료 - mentorId: {}", mentorId);

        return MentorResponse.from(savedMentor);
    }

    /**
     * 승인된 멘토 목록 조회
     */
    public List<MentorResponse> getApprovedMentors() {
        log.info("승인된 멘토 목록 조회");

        return mentorRepository.findByStatusOrderByCreatedAtDesc(MentorStatus.APPROVED).stream()
                .map(MentorResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 멘토 상세 정보 조회
     */
    public MentorResponse getMentorDetail(Long mentorId) {
        log.info("멘토 상세 조회 - mentorId: {}", mentorId);

        Mentor mentor = mentorRepository.findById(mentorId)
                .orElseThrow(() -> new ResourceNotFoundException("Mentor", "id", mentorId));

        return MentorResponse.from(mentor);
    }

    /**
     * 멘토 프로필 수정
     */
    @Transactional
    public MentorResponse updateMentorProfile(Long mentorId, MentorApplicationRequest request) {
        log.info("멘토 프로필 수정 - mentorId: {}", mentorId);

        Mentor mentor = mentorRepository.findById(mentorId)
                .orElseThrow(() -> new ResourceNotFoundException("Mentor", "id", mentorId));

        // 본인의 프로필인지 확인 (실제로는 JWT에서 userId를 가져와 확인해야 함)
        // if (!mentor.getUser().getUserId().equals(currentUserId)) {
        //     throw new RuntimeException("본인의 프로필만 수정할 수 있습니다.");
        // }

        if (request.getCompany() != null) {
            mentor.setCompany(request.getCompany());
        }
        if (request.getJob() != null) {
            mentor.setJob(request.getJob());
        }
        if (request.getExperience() != null) {
            mentor.setExperience(request.getExperience());
        }
        if (request.getBio() != null) {
            mentor.setBio(request.getBio());
        }
        if (request.getCareer() != null) {
            mentor.setCareer(request.getCareer());
        }
        if (request.getAvailableTime() != null) {
            mentor.setAvailableTime(request.getAvailableTime());
        }

        Mentor savedMentor = mentorRepository.save(mentor);

        log.info("멘토 프로필 수정 완료 - mentorId: {}", mentorId);

        return MentorResponse.from(savedMentor);
    }
}
