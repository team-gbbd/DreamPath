package com.dreampath.repository;

import com.dreampath.entity.ProfileAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProfileAnalysisRepository extends JpaRepository<ProfileAnalysis, Long> {

    Optional<ProfileAnalysis> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
