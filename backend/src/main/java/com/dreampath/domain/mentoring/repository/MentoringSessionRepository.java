package com.dreampath.domain.mentoring.repository;

import com.dreampath.domain.mentoring.entity.Mentor;
import com.dreampath.domain.mentoring.entity.MentoringSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface MentoringSessionRepository extends JpaRepository<MentoringSession, Long> {

    /**
     * 특정 멘토의 활성화된 세션 조회
     */
    List<MentoringSession> findByMentorAndIsActiveTrueOrderBySessionDateAsc(Mentor mentor);

    /**
     * 특정 멘토의 모든 세션 조회
     */
    List<MentoringSession> findByMentorOrderBySessionDateDesc(Mentor mentor);

    /**
     * 활성화된 모든 세션 조회 (미래 날짜만)
     */
    List<MentoringSession> findByIsActiveTrueAndSessionDateAfterOrderBySessionDateAsc(LocalDateTime now);

    /**
     * 예약 가능한 세션 조회 (활성화 + 미예약 + 미래 날짜)
     */
    List<MentoringSession> findByIsActiveTrueAndCurrentParticipantsLessThanAndSessionDateAfterOrderBySessionDateAsc(
            Integer maxParticipants, LocalDateTime now);

    /**
     * 특정 날짜 이후의 활성화된 세션 조회
     */
    List<MentoringSession> findByIsActiveTrueAndSessionDateBetweenOrderBySessionDateAsc(
            LocalDateTime startDate, LocalDateTime endDate);
}
