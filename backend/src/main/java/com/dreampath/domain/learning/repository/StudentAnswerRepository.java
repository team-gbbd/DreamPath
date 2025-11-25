package com.dreampath.domain.learning.repository;

import com.dreampath.domain.learning.entity.StudentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StudentAnswerRepository extends JpaRepository<StudentAnswer, Long> {

    Optional<StudentAnswer> findByQuestionQuestionIdAndUserUserId(Long questionId, Long userId);

    List<StudentAnswer> findByUserUserId(Long userId);

    List<StudentAnswer> findByQuestionQuestionId(Long questionId);

    boolean existsByQuestionQuestionIdAndUserUserId(Long questionId, Long userId);

    @Query("SELECT sa FROM StudentAnswer sa " +
           "JOIN sa.question q " +
           "JOIN q.weeklySession ws " +
           "WHERE ws.learningPath.pathId = :pathId AND sa.user.userId = :userId")
    List<StudentAnswer> findByLearningPathIdAndUserId(@Param("pathId") Long pathId, @Param("userId") Long userId);

    @Query("SELECT COUNT(sa) FROM StudentAnswer sa " +
           "JOIN sa.question q " +
           "JOIN q.weeklySession ws " +
           "WHERE ws.learningPath.pathId = :pathId AND sa.user.userId = :userId AND sa.score = q.maxScore")
    Long countCorrectAnswersByPathIdAndUserId(@Param("pathId") Long pathId, @Param("userId") Long userId);

    @Query("SELECT sa FROM StudentAnswer sa " +
           "JOIN sa.question q " +
           "WHERE q.weeklySession.weeklyId = :weeklyId AND sa.user.userId = :userId")
    List<StudentAnswer> findByWeeklySessionIdAndUserId(@Param("weeklyId") Long weeklyId, @Param("userId") Long userId);
}
