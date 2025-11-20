package com.dreampath.repository;

import com.dreampath.entity.ProfileHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileHistoryRepository extends JpaRepository<ProfileHistory, Long> {
}
