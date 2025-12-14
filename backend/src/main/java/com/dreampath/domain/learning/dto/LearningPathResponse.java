package com.dreampath.domain.learning.dto;

import com.dreampath.domain.learning.entity.LearningPath;
import com.dreampath.domain.learning.entity.WeeklySession;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
public class LearningPathResponse {

    private Long pathId;
    private String domain;
    private String status;
    private Integer totalQuestions;
    private Integer correctCount;
    private Integer earnedScore;      // 총 획득 점수
    private Integer totalMaxScore;    // 총 배점
    private Float scoreRate;          // 득점률 (%)
    private Float correctRate;        // 기존 호환용
    private String weaknessTags;
    private LocalDateTime createdAt;
    private List<WeeklySessionInfo> weeklySessions;

    // 추가 필드
    private Integer overallProgress;
    private Integer currentWeek;

    public static LearningPathResponse from(LearningPath path) {
        LearningPathResponse response = new LearningPathResponse();
        response.pathId = path.getPathId();
        response.domain = path.getDomain();
        response.status = path.getStatus().name();
        response.totalQuestions = path.getTotalQuestions();
        response.correctCount = path.getCorrectCount();
        response.earnedScore = path.getEarnedScore();
        response.totalMaxScore = path.getTotalMaxScore();
        response.scoreRate = path.getScoreRate();
        response.correctRate = path.getCorrectRate();
        response.weaknessTags = path.getWeaknessTags();
        response.createdAt = path.getCreatedAt();

        if (path.getWeeklySessions() != null) {
            response.weeklySessions = path.getWeeklySessions().stream()
                    .map(WeeklySessionInfo::from)
                    .collect(Collectors.toList());

            // currentWeek 계산: UNLOCKED 또는 COMPLETED 중 가장 높은 주차
            response.currentWeek = path.getWeeklySessions().stream()
                    .filter(s -> s.getStatus() != com.dreampath.global.enums.WeeklyStatus.LOCKED)
                    .mapToInt(WeeklySession::getWeekNumber)
                    .max()
                    .orElse(1);

            // overallProgress 계산: 완료된 주차 비율
            long completedCount = path.getWeeklySessions().stream()
                    .filter(s -> s.getStatus() == com.dreampath.global.enums.WeeklyStatus.COMPLETED)
                    .count();
            int totalWeeks = path.getWeeklySessions().size();
            response.overallProgress = totalWeeks > 0 ? (int) ((completedCount * 100) / totalWeeks) : 0;
        } else {
            response.currentWeek = 1;
            response.overallProgress = 0;
        }

        return response;
    }

    @Getter
    @Setter
    public static class WeeklySessionInfo {
        private Long weeklyId;
        private Integer weekNumber;
        private String status;
        private Boolean isCompleted;
        private Integer questionCount;
        private Integer correctCount;
        private Integer earnedScore;
        private Integer totalScore;
        private Float scoreRate;
        private String aiSummary;
        private LocalDateTime createdAt;
        private LocalDateTime completedAt;
        private LocalDateTime unlockAt;

        public static WeeklySessionInfo from(WeeklySession session) {
            WeeklySessionInfo info = new WeeklySessionInfo();
            info.weeklyId = session.getWeeklyId();
            info.weekNumber = session.getWeekNumber();
            info.status = session.getStatus().name();
            info.isCompleted = session.getStatus() == com.dreampath.global.enums.WeeklyStatus.COMPLETED;

            // LAZY 로딩: questions 컬렉션 초기화
            try {
                info.questionCount = session.getQuestions() != null ? session.getQuestions().size() : 0;
            } catch (Exception e) {
                // LAZY 로딩 실패 시 0으로 설정
                info.questionCount = 0;
            }

            info.correctCount = session.getCorrectCount() != null ? session.getCorrectCount() : 0;
            info.earnedScore = session.getEarnedScore() != null ? session.getEarnedScore() : 0;
            info.totalScore = session.getTotalScore() != null ? session.getTotalScore() : 0;
            info.scoreRate = info.totalScore > 0 ? (float) info.earnedScore / info.totalScore * 100 : 0.0f;
            info.aiSummary = session.getAiSummary();
            info.createdAt = session.getCreatedAt();
            info.completedAt = session.getCompletedAt();
            info.unlockAt = session.getUnlockAt();
            return info;
        }
    }
}
