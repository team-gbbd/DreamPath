package com.dreampath.domain.learning.service;

import com.dreampath.domain.learning.entity.WeeklySession;
import com.dreampath.global.enums.WeeklyStatus;
import com.dreampath.global.exception.ResourceNotFoundException;
import com.dreampath.domain.learning.repository.WeeklySessionRepository;
import com.dreampath.domain.learning.repository.StudentAnswerRepository;
import com.dreampath.domain.learning.repository.WeeklyQuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WeeklySessionService {

    private final WeeklySessionRepository weeklySessionRepository;
    private final StudentAnswerRepository studentAnswerRepository;
    private final WeeklyQuestionRepository weeklyQuestionRepository;

    @Transactional(readOnly = true)
    public WeeklySession getWeeklySession(Long weeklyId) {
        return weeklySessionRepository.findById(weeklyId)
                .orElseThrow(() -> new ResourceNotFoundException("WeeklySession", "id", weeklyId));
    }

    @Transactional(readOnly = true)
    public List<WeeklySession> getPathSessions(Long pathId) {
        return weeklySessionRepository.findByLearningPathPathIdOrderByWeekNumberAsc(pathId);
    }

    @Transactional(readOnly = true)
    public WeeklySession getSessionByWeekNumber(Long pathId, Integer weekNumber) {
        return weeklySessionRepository.findByLearningPathPathIdAndWeekNumber(pathId, weekNumber)
                .orElseThrow(() -> new ResourceNotFoundException("WeeklySession", "weekNumber", weekNumber));
    }

    @Transactional
    public WeeklySession updateStatus(Long weeklyId, WeeklyStatus status) {
        WeeklySession session = getWeeklySession(weeklyId);
        session.setStatus(status);
        return weeklySessionRepository.save(session);
    }

    @Transactional
    public WeeklySession completeSession(Long weeklyId) {
        WeeklySession session = getWeeklySession(weeklyId);
        session.setStatus(WeeklyStatus.COMPLETED);

        // correctCount 계산 및 업데이트
        updateCorrectCount(session);

        // 다음 주차 자동 잠금 해제
        Integer nextWeek = session.getWeekNumber() + 1;
        if (nextWeek <= 4) {
            weeklySessionRepository.findByLearningPathPathIdAndWeekNumber(
                session.getLearningPath().getPathId(), nextWeek
            ).ifPresent(nextSession -> {
                nextSession.setStatus(WeeklyStatus.UNLOCKED);
                weeklySessionRepository.save(nextSession);
            });
        }

        return weeklySessionRepository.save(session);
    }

    /**
     * WeeklySession의 점수 통계를 업데이트
     */
    @Transactional
    public void updateCorrectCount(WeeklySession session) {
        Long userId = session.getLearningPath().getUser().getUserId();

        // 해당 주차의 모든 문제 가져오기
        var questions = weeklyQuestionRepository.findByWeeklySessionWeeklyId(session.getWeeklyId());

        int totalScore = 0;
        int earnedScore = 0;
        int correctCount = 0;

        for (var question : questions) {
            totalScore += question.getMaxScore();

            var answer = studentAnswerRepository.findByQuestionQuestionIdAndUserUserId(
                question.getQuestionId(), userId
            );

            if (answer.isPresent() && answer.get().getScore() != null) {
                earnedScore += answer.get().getScore();

                // 60% 이상 득점하면 정답으로 카운트
                if (question.getMaxScore() > 0) {
                    float scoreRate = (float) answer.get().getScore() / question.getMaxScore();
                    if (scoreRate >= 0.6f) {
                        correctCount++;
                    }
                }
            }
        }

        session.setTotalScore(totalScore);
        session.setEarnedScore(earnedScore);
        session.setCorrectCount(correctCount);
        weeklySessionRepository.save(session);
    }

    @Transactional
    public WeeklySession updateAiSummary(Long weeklyId, String aiSummary) {
        WeeklySession session = getWeeklySession(weeklyId);
        session.setAiSummary(aiSummary);
        return weeklySessionRepository.save(session);
    }

    @Transactional(readOnly = true)
    public boolean canAccessSession(Long weeklyId) {
        WeeklySession session = getWeeklySession(weeklyId);
        return session.getStatus() != WeeklyStatus.LOCKED;
    }
}
