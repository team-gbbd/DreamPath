package com.dreampath.domain.mentoring.service;

import com.dreampath.domain.mentoring.dto.mentoring.MentoringSessionRequest;
import com.dreampath.domain.mentoring.dto.mentoring.MentoringSessionResponse;
import com.dreampath.domain.mentoring.entity.Mentor;
import com.dreampath.domain.mentoring.entity.MentoringSession;
import com.dreampath.global.exception.ResourceNotFoundException;
import com.dreampath.domain.mentoring.repository.MentorRepository;
import com.dreampath.domain.mentoring.repository.MentoringSessionRepository;
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
public class MentoringSessionService {

    private final MentoringSessionRepository sessionRepository;
    private final MentorRepository mentorRepository;

    /**
     * 멘토링 세션 생성
     */
    @Transactional
    public MentoringSessionResponse createSession(MentoringSessionRequest request) {
        log.info("멘토링 세션 생성 - mentorId: {}, title: {}", request.getMentorId(), request.getTitle());

        // 시간 정각 검증
        validateSessionTime(request.getSessionDate());

        Mentor mentor = mentorRepository.findById(request.getMentorId())
                .orElseThrow(() -> new ResourceNotFoundException("Mentor", "id", request.getMentorId()));

        MentoringSession session = new MentoringSession();
        session.setMentor(mentor);
        session.setTitle(request.getTitle());
        session.setDescription(request.getDescription());
        session.setSessionDate(request.getSessionDate());
        session.setDurationMinutes(60); // 1시간 고정
        session.setCurrentParticipants(0);
        session.setIsActive(true);

        MentoringSession savedSession = sessionRepository.save(session);
        log.info("멘토링 세션 생성 완료 - sessionId: {}", savedSession.getSessionId());

        return MentoringSessionResponse.from(savedSession);
    }

    /**
     * 세션 시간 정각 검증
     */
    private void validateSessionTime(LocalDateTime sessionDate) {
        if (sessionDate.getMinute() != 0 || sessionDate.getSecond() != 0) {
            throw new RuntimeException("멘토링 시간은 정각에만 설정 가능합니다. (예: 14:00, 15:00)");
        }
    }

    /**
     * 멘토링 세션 수정
     */
    @Transactional
    public MentoringSessionResponse updateSession(Long sessionId, MentoringSessionRequest request) {
        log.info("멘토링 세션 수정 - sessionId: {}", sessionId);

        // 시간 정각 검증
        validateSessionTime(request.getSessionDate());

        MentoringSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("MentoringSession", "id", sessionId));

        session.setTitle(request.getTitle());
        session.setDescription(request.getDescription());
        session.setSessionDate(request.getSessionDate());
        session.setDurationMinutes(60); // 1시간 고정

        return MentoringSessionResponse.from(session);
    }

    /**
     * 멘토링 세션 비활성화
     */
    @Transactional
    public void deactivateSession(Long sessionId) {
        log.info("멘토링 세션 비활성화 - sessionId: {}", sessionId);

        MentoringSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("MentoringSession", "id", sessionId));

        session.setIsActive(false);
    }

    /**
     * 특정 멘토의 모든 세션 조회
     */
    @Transactional(readOnly = true)
    public List<MentoringSessionResponse> getMentorSessions(Long mentorId) {
        log.info("멘토 세션 목록 조회 - mentorId: {}", mentorId);

        Mentor mentor = mentorRepository.findById(mentorId)
                .orElseThrow(() -> new ResourceNotFoundException("Mentor", "id", mentorId));

        return sessionRepository.findByMentorOrderBySessionDateDesc(mentor).stream()
                .map(MentoringSessionResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 예약 가능한 세션 조회 (학생용)
     * - 활성화된 세션
     * - 예약되지 않은 세션 (currentParticipants < 1)
     * - 미래 날짜
     */
    @Transactional(readOnly = true)
    public List<MentoringSessionResponse> getAvailableSessions() {
        log.info("예약 가능한 세션 목록 조회");

        LocalDateTime now = LocalDateTime.now();
        return sessionRepository.findByIsActiveTrueAndCurrentParticipantsLessThanAndSessionDateAfterOrderBySessionDateAsc(1, now).stream()
                .map(MentoringSessionResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 세션 상세 조회
     */
    @Transactional(readOnly = true)
    public MentoringSessionResponse getSession(Long sessionId) {
        log.info("세션 상세 조회 - sessionId: {}", sessionId);

        MentoringSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("MentoringSession", "id", sessionId));

        return MentoringSessionResponse.from(session);
    }

    /**
     * 세션 참가자 수 증가
     */
    @Transactional
    public void incrementParticipants(Long sessionId) {
        log.info("세션 참가자 수 증가 - sessionId: {}", sessionId);

        MentoringSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("MentoringSession", "id", sessionId));

        if (session.isFull()) {
            throw new RuntimeException("세션이 만료되었습니다.");
        }

        session.incrementParticipants();
    }

    /**
     * 세션 참가자 수 감소
     */
    @Transactional
    public void decrementParticipants(Long sessionId) {
        log.info("세션 참가자 수 감소 - sessionId: {}", sessionId);

        MentoringSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("MentoringSession", "id", sessionId));

        session.decrementParticipants();
    }
}
