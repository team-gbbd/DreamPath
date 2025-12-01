package com.dreampath.domain.profile.repository;

import com.dreampath.domain.profile.entity.ProfileAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProfileAnalysisRepository extends JpaRepository<ProfileAnalysis, Long> {

    Optional<ProfileAnalysis> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
