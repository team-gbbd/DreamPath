package com.dreampath.domain.profile.repository;

import com.dreampath.domain.profile.entity.ProfileHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileHistoryRepository extends JpaRepository<ProfileHistory, Long> {
}
