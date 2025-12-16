package com.dreampath.domain.learning.repository;

import com.dreampath.domain.learning.entity.WeaknessAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WeaknessAnalysisRepository extends JpaRepository<WeaknessAnalysis, Long> {

    Optional<WeaknessAnalysis> findByLearningPathPathId(Long pathId);

    boolean existsByLearningPathPathId(Long pathId);
}
