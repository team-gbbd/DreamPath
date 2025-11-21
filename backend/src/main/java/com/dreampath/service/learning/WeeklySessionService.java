package com.dreampath.service.learning;

import com.dreampath.entity.learning.WeeklySession;
import com.dreampath.enums.WeeklyStatus;
import com.dreampath.exception.ResourceNotFoundException;
import com.dreampath.repository.learning.WeeklySessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WeeklySessionService {

    private final WeeklySessionRepository weeklySessionRepository;

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
