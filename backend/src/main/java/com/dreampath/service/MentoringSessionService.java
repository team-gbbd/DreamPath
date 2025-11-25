package com.dreampath.service;

import com.dreampath.dto.mentoring.MentoringSessionRequest;
import com.dreampath.dto.mentoring.MentoringSessionResponse;
import com.dreampath.entity.Mentor;
import com.dreampath.entity.MentoringSession;
import com.dreampath.exception.ResourceNotFoundException;
import com.dreampath.repository.MentorRepository;
import com.dreampath.repository.MentoringSessionRepository;
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

        Mentor mentor = mentorRepository.findById(request.getMentorId())
                .orElseThrow(() -> new ResourceNotFoundException("Mentor", "id", request.getMentorId()));

        MentoringSession session = new MentoringSession();
        session.setMentor(mentor);
        session.setTitle(request.getTitle());
        session.setDescription(request.getDescription());
        session.setSessionDate(request.getSessionDate());
        session.setDurationMinutes(request.getDurationMinutes());
        session.setPrice(request.getPrice());
        session.setCurrentParticipants(0);
        session.setIsActive(true);

        MentoringSession savedSession = sessionRepository.save(session);
        log.info("멘토링 세션 생성 완료 - sessionId: {}", savedSession.getSessionId());

        return MentoringSessionResponse.from(savedSession);
    }

    /**
     * 멘토링 세션 수정
     */
    @Transactional
    public MentoringSessionResponse updateSession(Long sessionId, MentoringSessionRequest request) {
        log.info("멘토링 세션 수정 - sessionId: {}", sessionId);

        MentoringSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("MentoringSession", "id", sessionId));

        session.setTitle(request.getTitle());
        session.setDescription(request.getDescription());
        session.setSessionDate(request.getSessionDate());
        session.setDurationMinutes(request.getDurationMinutes());
        session.setPrice(request.getPrice());

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
     * 활성화된 모든 세션 조회 (학생용)
     */
    @Transactional(readOnly = true)
    public List<MentoringSessionResponse> getAvailableSessions() {
        log.info("활성화된 세션 목록 조회");

        LocalDateTime now = LocalDateTime.now();
        return sessionRepository.findByIsActiveTrueAndSessionDateAfterOrderBySessionDateAsc(now).stream()
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
