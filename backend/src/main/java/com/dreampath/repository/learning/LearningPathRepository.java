package com.dreampath.repository.learning;

import com.dreampath.entity.learning.LearningPath;
import com.dreampath.enums.PathStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LearningPathRepository extends JpaRepository<LearningPath, Long> {

    List<LearningPath> findByUserUserId(Long userId);

    List<LearningPath> findByUserUserIdAndStatus(Long userId, PathStatus status);

    Optional<LearningPath> findByUserUserIdAndCareerAnalysisId(Long userId, Long analysisId);

    boolean existsByUserUserIdAndStatus(Long userId, PathStatus status);

    @Query("SELECT DISTINCT lp FROM LearningPath lp " +
           "LEFT JOIN FETCH lp.weeklySessions " +
           "WHERE lp.pathId = :pathId")
    Optional<LearningPath> findByIdWithSessions(@Param("pathId") Long pathId);

    @Query("SELECT DISTINCT lp FROM LearningPath lp " +
           "LEFT JOIN FETCH lp.weeklySessions " +
           "WHERE lp.user.userId = :userId")
    List<LearningPath> findByUserIdWithSessions(@Param("userId") Long userId);
}
