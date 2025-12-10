package com.dreampath.domain.recommendation.repository;

import com.dreampath.domain.recommendation.entity.JobRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobRecommendationRepository extends JpaRepository<JobRecommendation, Long> {

    List<JobRecommendation> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
