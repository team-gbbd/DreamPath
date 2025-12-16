package com.dreampath.domain.learning.service;

import com.dreampath.domain.user.entity.User;
import com.dreampath.domain.career.entity.CareerAnalysis;
import com.dreampath.domain.learning.entity.LearningPath;
import com.dreampath.domain.learning.entity.WeeklySession;
import com.dreampath.global.enums.PathStatus;
import com.dreampath.global.enums.WeeklyStatus;
import com.dreampath.global.exception.ResourceNotFoundException;
import com.dreampath.domain.learning.repository.LearningPathRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LearningPathService {

    private final LearningPathRepository learningPathRepository;

    @Transactional
    public LearningPath createLearningPath(User user, CareerAnalysis careerAnalysis, String domain) {
        LearningPath learningPath = new LearningPath();
        learningPath.setUser(user);
        learningPath.setCareerAnalysis(careerAnalysis);
        learningPath.setDomain(domain);
        learningPath.setStatus(PathStatus.ACTIVE);
        learningPath.setTotalQuestions(0);
        learningPath.setCorrectCount(0);

        // 4주차 세션 자동 생성
        List<WeeklySession> sessions = new ArrayList<>();
        for (int week = 1; week <= 4; week++) {
            WeeklySession session = new WeeklySession();
            session.setLearningPath(learningPath);
            session.setWeekNumber(week);
            session.setStatus(week == 1 ? WeeklyStatus.UNLOCKED : WeeklyStatus.LOCKED);
            sessions.add(session);
        }
        learningPath.setWeeklySessions(sessions);

        return learningPathRepository.save(learningPath);
    }

    @Transactional(readOnly = true)
    public LearningPath getLearningPath(Long pathId) {
        return learningPathRepository.findByIdWithSessions(pathId)
                .orElseThrow(() -> new ResourceNotFoundException("LearningPath", "id", pathId));
    }

    @Transactional(readOnly = true)
    public List<LearningPath> getUserLearningPaths(Long userId) {
        return learningPathRepository.findByUserIdWithSessions(userId);
    }

    @Transactional(readOnly = true)
    public List<LearningPath> getActiveLearningPaths(Long userId) {
        return learningPathRepository.findByUserUserIdAndStatus(userId, PathStatus.ACTIVE);
    }

    @Transactional
    public LearningPath updateStatus(Long pathId, PathStatus status) {
        LearningPath learningPath = getLearningPath(pathId);
        learningPath.setStatus(status);
        return learningPathRepository.save(learningPath);
    }

    @Transactional
    public LearningPath updateStatistics(Long pathId, int totalQuestions, int correctCount) {
        LearningPath learningPath = getLearningPath(pathId);
        learningPath.setTotalQuestions(totalQuestions);
        learningPath.setCorrectCount(correctCount);
        return learningPathRepository.save(learningPath);
    }

    @Transactional
    public LearningPath updateStatistics(Long pathId, int totalQuestions, int correctCount, int earnedScore, int totalMaxScore) {
        LearningPath learningPath = getLearningPath(pathId);
        learningPath.setTotalQuestions(totalQuestions);
        learningPath.setCorrectCount(correctCount);
        learningPath.setEarnedScore(earnedScore);
        learningPath.setTotalMaxScore(totalMaxScore);
        return learningPathRepository.save(learningPath);
    }

    @Transactional
    public LearningPath updateWeaknessTags(Long pathId, String weaknessTags) {
        LearningPath learningPath = getLearningPath(pathId);
        learningPath.setWeaknessTags(weaknessTags);
        return learningPathRepository.save(learningPath);
    }
}
