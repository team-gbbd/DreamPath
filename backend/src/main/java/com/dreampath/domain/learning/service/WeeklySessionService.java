package com.dreampath.domain.learning.service;

import com.dreampath.domain.learning.entity.LearningPath;
import com.dreampath.domain.learning.entity.StudentAnswer;
import com.dreampath.domain.learning.entity.WeeklySession;
import com.dreampath.global.enums.WeeklyStatus;
import com.dreampath.global.exception.ResourceNotFoundException;
import com.dreampath.domain.learning.repository.WeeklySessionRepository;
import com.dreampath.domain.learning.repository.StudentAnswerRepository;
import com.dreampath.domain.learning.repository.WeeklyQuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WeeklySessionService {

    private final WeeklySessionRepository weeklySessionRepository;
    private final StudentAnswerRepository studentAnswerRepository;
    private final WeeklyQuestionRepository weeklyQuestionRepository;
    private final WeaknessAnalysisService weaknessAnalysisService;

    @Transactional(readOnly = true)
    public WeeklySession getWeeklySession(Long weeklyId) {
        return weeklySessionRepository.findById(weeklyId)
                .orElseThrow(() -> new ResourceNotFoundException("WeeklySession", "id", weeklyId));
    }

    @Transactional
    public List<WeeklySession> getPathSessions(Long pathId) {
        List<WeeklySession> sessions = weeklySessionRepository.findByLearningPathPathIdOrderByWeekNumberAsc(pathId);

        // unlockAt 시간이 지난 세션 자동 잠금 해제
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        for (WeeklySession session : sessions) {
            if (session.getStatus() == WeeklyStatus.LOCKED
                    && session.getUnlockAt() != null
                    && session.getUnlockAt().isBefore(now)) {
                session.setStatus(WeeklyStatus.UNLOCKED);
                weeklySessionRepository.save(session);
                log.info("주차 자동 잠금 해제 - weeklyId: {}, weekNumber: {}", session.getWeeklyId(), session.getWeekNumber());
            }
        }

        return sessions;
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
        session.setCompletedAt(java.time.LocalDateTime.now());

        // correctCount 계산 및 업데이트
        updateCorrectCount(session);

        // 다음 주차 잠금 해제 예정 시간 설정 (7일 후)
        Integer nextWeek = session.getWeekNumber() + 1;
        if (nextWeek <= 4) {
            weeklySessionRepository.findByLearningPathPathIdAndWeekNumber(
                session.getLearningPath().getPathId(), nextWeek
            ).ifPresent(nextSession -> {
                nextSession.setUnlockAt(java.time.LocalDateTime.now().plusDays(7));
                weeklySessionRepository.save(nextSession);
            });
        }

        WeeklySession savedSession = weeklySessionRepository.save(session);

        // 약점 분석 비동기 실행
        triggerWeaknessAnalysis(session.getLearningPath());

        return savedSession;
    }

    /**
     * 약점 분석을 비동기로 실행하여 DB에 저장
     */
    private void triggerWeaknessAnalysis(LearningPath learningPath) {
        try {
            Long pathId = learningPath.getPathId();
            Long userId = learningPath.getUser().getUserId();

            // 모든 오답 조회 (60% 미만 득점)
            List<StudentAnswer> allAnswers = studentAnswerRepository.findByLearningPathIdAndUserId(pathId, userId);
            List<StudentAnswer> wrongAnswers = allAnswers.stream()
                    .filter(a -> a.getScore() != null && a.getQuestion().getMaxScore() != null
                            && a.getQuestion().getMaxScore() > 0
                            && (float) a.getScore() / a.getQuestion().getMaxScore() < 0.6f)
                    .collect(Collectors.toList());

            if (wrongAnswers.size() >= 3) {
                log.info("약점 분석 실행 - pathId: {}, 오답 수: {}", pathId, wrongAnswers.size());
                weaknessAnalysisService.analyzeAndSave(learningPath, wrongAnswers);
            } else {
                log.info("약점 분석 스킵 - 오답 수 부족 ({}개)", wrongAnswers.size());
            }
        } catch (Exception e) {
            log.error("약점 분석 트리거 실패: {}", e.getMessage());
        }
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
