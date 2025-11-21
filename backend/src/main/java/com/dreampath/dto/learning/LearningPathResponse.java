package com.dreampath.dto.learning;

import com.dreampath.entity.learning.LearningPath;
import com.dreampath.entity.learning.WeeklySession;
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
    private Float correctRate;
    private String weaknessTags;
    private LocalDateTime createdAt;
    private List<WeeklySessionInfo> weeklySessions;

    public static LearningPathResponse from(LearningPath path) {
        LearningPathResponse response = new LearningPathResponse();
        response.pathId = path.getPathId();
        response.domain = path.getDomain();
        response.status = path.getStatus().name();
        response.totalQuestions = path.getTotalQuestions();
        response.correctCount = path.getCorrectCount();
        response.correctRate = path.getCorrectRate();
        response.weaknessTags = path.getWeaknessTags();
        response.createdAt = path.getCreatedAt();

        if (path.getWeeklySessions() != null) {
            response.weeklySessions = path.getWeeklySessions().stream()
                    .map(WeeklySessionInfo::from)
                    .collect(Collectors.toList());
        }

        return response;
    }

    @Getter
    @Setter
    public static class WeeklySessionInfo {
        private Long weeklyId;
        private Integer weekNumber;
        private String status;
        private Integer questionCount;
        private Integer correctCount;
        private String aiSummary;
        private LocalDateTime createdAt;

        public static WeeklySessionInfo from(WeeklySession session) {
            WeeklySessionInfo info = new WeeklySessionInfo();
            info.weeklyId = session.getWeeklyId();
            info.weekNumber = session.getWeekNumber();
            info.status = session.getStatus().name();

            // LAZY 로딩: questions 컬렉션 초기화
            try {
                info.questionCount = session.getQuestions() != null ? session.getQuestions().size() : 0;
            } catch (Exception e) {
                // LAZY 로딩 실패 시 0으로 설정
                info.questionCount = 0;
            }

            info.correctCount = 0; // 나중에 계산 로직 추가 필요
            info.aiSummary = session.getAiSummary();
            info.createdAt = session.getCreatedAt();
            return info;
        }
    }
}
