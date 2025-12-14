package com.dreampath.domain.career.repository;

import com.dreampath.domain.career.entity.CareerSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CareerSessionRepository extends JpaRepository<CareerSession, Long> {
    Optional<CareerSession> findBySessionId(String sessionId);

    /**
     * 세션과 메시지를 함께 조회 (JOIN FETCH로 N+1 문제 방지)
     */
    @Query("SELECT s FROM CareerSession s LEFT JOIN FETCH s.messages WHERE s.sessionId = :sessionId")
    Optional<CareerSession> findBySessionIdWithMessages(@Param("sessionId") String sessionId);

    Optional<CareerSession> findFirstByUserIdAndStatusOrderByUpdatedAtDesc(
            String userId,
            CareerSession.SessionStatus status
    );

    // 특정 사용자의 특정 상태 세션 목록 조회
    List<CareerSession> findAllByUserIdAndStatus(String userId, CareerSession.SessionStatus status);
}
