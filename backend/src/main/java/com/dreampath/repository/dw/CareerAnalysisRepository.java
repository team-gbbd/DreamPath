package com.dreampath.repository.dw;

import com.dreampath.entity.dw.CareerAnalysis;
import com.dreampath.entity.dw.CareerSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CareerAnalysisRepository extends JpaRepository<CareerAnalysis, Long> {
    Optional<CareerAnalysis> findBySession(CareerSession session);
}

