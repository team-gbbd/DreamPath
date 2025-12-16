package com.dreampath.domain.career.repository;

import com.dreampath.domain.career.entity.CareerAnalysis;
import com.dreampath.domain.career.entity.CareerSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CareerAnalysisRepository extends JpaRepository<CareerAnalysis, Long> {
    Optional<CareerAnalysis> findBySession(CareerSession session);
    Optional<CareerAnalysis> findBySession_SessionId(String sessionId);
}
