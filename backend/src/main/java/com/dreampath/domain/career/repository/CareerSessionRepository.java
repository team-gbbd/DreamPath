package com.dreampath.domain.career.repository;

import com.dreampath.domain.career.entity.CareerSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CareerSessionRepository extends JpaRepository<CareerSession, Long> {
    Optional<CareerSession> findBySessionId(String sessionId);
}

