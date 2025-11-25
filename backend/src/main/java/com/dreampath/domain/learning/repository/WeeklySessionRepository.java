package com.dreampath.domain.learning.repository;

import com.dreampath.domain.learning.entity.WeeklySession;
import com.dreampath.global.enums.WeeklyStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WeeklySessionRepository extends JpaRepository<WeeklySession, Long> {

    List<WeeklySession> findByLearningPathPathId(Long pathId);

    List<WeeklySession> findByLearningPathPathIdOrderByWeekNumberAsc(Long pathId);

    Optional<WeeklySession> findByLearningPathPathIdAndWeekNumber(Long pathId, Integer weekNumber);

    List<WeeklySession> findByLearningPathPathIdAndStatus(Long pathId, WeeklyStatus status);
}
