package com.dreampath.domain.learning.repository;

import com.dreampath.domain.learning.entity.WeeklyQuestion;
import com.dreampath.global.enums.QuestionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WeeklyQuestionRepository extends JpaRepository<WeeklyQuestion, Long> {

    List<WeeklyQuestion> findByWeeklySessionWeeklyId(Long weeklyId);

    List<WeeklyQuestion> findByWeeklySessionWeeklyIdOrderByOrderNumAsc(Long weeklyId);

    List<WeeklyQuestion> findByWeeklySessionWeeklyIdAndQuestionType(Long weeklyId, QuestionType questionType);

    Long countByWeeklySessionWeeklyId(Long weeklyId);
}
