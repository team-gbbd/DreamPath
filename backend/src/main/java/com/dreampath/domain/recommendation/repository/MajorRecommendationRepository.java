package com.dreampath.domain.recommendation.repository;

import com.dreampath.domain.recommendation.entity.MajorRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MajorRecommendationRepository extends JpaRepository<MajorRecommendation, Long> {

    List<MajorRecommendation> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
