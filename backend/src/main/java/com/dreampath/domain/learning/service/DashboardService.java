package com.dreampath.domain.learning.service;

import com.dreampath.domain.learning.entity.LearningPath;
import com.dreampath.domain.learning.entity.StudentAnswer;
import com.dreampath.domain.learning.entity.WeeklyQuestion;
import com.dreampath.domain.learning.entity.WeeklySession;
import com.dreampath.global.enums.QuestionType;
import com.dreampath.global.enums.WeeklyStatus;
import com.dreampath.domain.learning.repository.StudentAnswerRepository;
import com.dreampath.domain.learning.repository.WeeklyQuestionRepository;
import com.dreampath.domain.learning.repository.WeeklySessionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final LearningPathService learningPathService;
    private final WeeklySessionRepository sessionRepository;
    private final WeeklyQuestionRepository questionRepository;
    private final StudentAnswerRepository answerRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public DashboardData getDashboard(Long pathId) {
        LearningPath path = learningPathService.getLearningPath(pathId);
        Long userId = path.getUser().getUserId();
        List<WeeklySession> sessions = sessionRepository.findByLearningPathPathIdOrderByWeekNumberAsc(pathId);
        List<StudentAnswer> answers = answerRepository.findByLearningPathIdAndUserId(pathId, userId);

        // 실시간으로 총 문제 수, 점수 계산
        int totalQuestions = 0;
        int totalEarnedScore = 0;
        int totalMaxScore = 0;
        for (WeeklySession session : sessions) {
            List<WeeklyQuestion> questions = questionRepository.findByWeeklySessionWeeklyId(session.getWeeklyId());
            totalQuestions += questions.size();
            totalEarnedScore += session.getEarnedScore() != null ? session.getEarnedScore() : 0;
            totalMaxScore += session.getTotalScore() != null ? session.getTotalScore() : 0;
        }

        DashboardData dashboard = new DashboardData();
        dashboard.pathId = pathId;
        dashboard.domain = path.getDomain();
        dashboard.status = path.getStatus().name();
        dashboard.totalQuestions = totalQuestions;
        dashboard.answeredQuestions = answers.size();
        dashboard.correctCount = path.getCorrectCount() != null ? path.getCorrectCount() : 0;
        dashboard.earnedScore = totalEarnedScore;
        dashboard.totalMaxScore = totalMaxScore;
        dashboard.scoreRate = totalMaxScore > 0 ? (float) totalEarnedScore / totalMaxScore * 100 : 0.0f;
        dashboard.correctRate = path.getCorrectRate() != null ? path.getCorrectRate() : 0.0f;

        // 주차별 진행률
        dashboard.weeklyProgress = calculateWeeklyProgress(sessions, answers);

        // 문제 유형별 정답률
        dashboard.typeAccuracy = calculateTypeAccuracy(answers);

        // 약점 분석
        dashboard.weaknessAnalysis = analyzeWeaknesses(answers);

        return dashboard;
    }

    private List<WeeklyProgress> calculateWeeklyProgress(List<WeeklySession> sessions, List<StudentAnswer> answers) {
        List<WeeklyProgress> progressList = new ArrayList<>();

        for (WeeklySession session : sessions) {
            WeeklyProgress progress = new WeeklyProgress();
            progress.weekNumber = session.getWeekNumber();
            progress.status = session.getStatus().name();

            List<WeeklyQuestion> questions = questionRepository.findByWeeklySessionWeeklyId(session.getWeeklyId());
            progress.questionCount = questions.size();

            // 이 주차의 답변 필터링
            List<StudentAnswer> weekAnswers = answers.stream()
                    .filter(a -> questions.stream()
                            .anyMatch(q -> q.getQuestionId().equals(a.getQuestion().getQuestionId())))
                    .collect(Collectors.toList());

            // 점수 계산
            int totalScore = questions.stream().mapToInt(WeeklyQuestion::getMaxScore).sum();
            int earnedScore = weekAnswers.stream()
                    .mapToInt(a -> a.getScore() != null ? a.getScore() : 0)
                    .sum();

            progress.totalScore = totalScore;
            progress.earnedScore = earnedScore;
            progress.scoreRate = totalScore > 0 ? (float) earnedScore / totalScore * 100 : 0.0f;
            progress.correctRate = progress.scoreRate;  // 기존 호환용

            // 60% 이상이면 정답으로 간주
            int correctAnswers = (int) weekAnswers.stream()
                    .filter(a -> a.getScore() != null && a.getQuestion().getMaxScore() > 0
                            && (float) a.getScore() / a.getQuestion().getMaxScore() >= 0.6f)
                    .count();
            progress.correctCount = correctAnswers;

            progressList.add(progress);
        }

        return progressList;
    }

    private List<TypeAccuracy> calculateTypeAccuracy(List<StudentAnswer> answers) {
        List<TypeAccuracy> typeAccuracyList = new ArrayList<>();

        for (QuestionType type : QuestionType.values()) {
            List<StudentAnswer> typeAnswers = answers.stream()
                    .filter(a -> a.getQuestion().getQuestionType() == type)
                    .collect(Collectors.toList());

            if (!typeAnswers.isEmpty()) {
                int totalScore = typeAnswers.stream()
                        .mapToInt(a -> a.getQuestion().getMaxScore())
                        .sum();
                int earnedScore = typeAnswers.stream()
                        .mapToInt(a -> a.getScore() != null ? a.getScore() : 0)
                        .sum();

                float accuracy = totalScore > 0 ? (float) earnedScore / totalScore * 100 : 0.0f;

                // 60% 이상이면 정답으로 간주
                int correctCount = (int) typeAnswers.stream()
                        .filter(a -> a.getScore() != null && a.getQuestion().getMaxScore() > 0
                                && (float) a.getScore() / a.getQuestion().getMaxScore() >= 0.6f)
                        .count();

                TypeAccuracy typeAcc = new TypeAccuracy();
                typeAcc.questionType = type.name();
                typeAcc.totalQuestions = typeAnswers.size();
                typeAcc.correctCount = correctCount;
                typeAcc.accuracy = accuracy;

                typeAccuracyList.add(typeAcc);
            }
        }

        return typeAccuracyList;
    }

    private WeaknessAnalysis analyzeWeaknesses(List<StudentAnswer> answers) {
        List<FeedbackItem> feedbackList = new ArrayList<>();

        // 모든 답변의 피드백 수집 (최신순, 최대 10개)
        answers.stream()
                .filter(a -> a.getAiFeedback() != null && !a.getAiFeedback().isEmpty())
                .sorted((a, b) -> b.getSubmittedAt().compareTo(a.getSubmittedAt()))
                .limit(10)
                .forEach(a -> {
                    FeedbackItem item = new FeedbackItem();
                    item.questionText = truncate(a.getQuestion().getQuestionText(), 50);
                    item.feedback = a.getAiFeedback();
                    item.isCorrect = a.getScore() != null && a.getQuestion().getMaxScore() != null
                            && (float) a.getScore() / a.getQuestion().getMaxScore() >= 0.6f;
                    item.score = a.getScore() != null ? a.getScore() : 0;
                    item.maxScore = a.getQuestion().getMaxScore();
                    item.correctAnswer = a.getQuestion().getCorrectAnswer();
                    item.userAnswer = truncate(a.getUserAnswer(), 100);
                    item.questionType = a.getQuestion().getQuestionType().name();
                    feedbackList.add(item);
                });

        // 오답 개수
        long wrongCount = answers.stream()
                .filter(a -> a.getScore() != null && a.getQuestion().getMaxScore() != null
                        && (float) a.getScore() / a.getQuestion().getMaxScore() < 0.6f)
                .count();

        WeaknessAnalysis analysis = new WeaknessAnalysis();
        analysis.totalWeak = (int) wrongCount;
        analysis.weakTags = new ArrayList<>(); // 기존 호환성 유지
        analysis.feedbackList = feedbackList;

        return analysis;
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        if (text.length() <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
    }

    public static class DashboardData {
        public Long pathId;
        public String domain;
        public String status;
        public Integer totalQuestions;
        public Integer answeredQuestions;
        public Integer correctCount;
        public Integer earnedScore;      // 총 획득 점수
        public Integer totalMaxScore;    // 총 배점
        public Float scoreRate;          // 득점률 (%)
        public Float correctRate;        // 기존 호환용
        public List<WeeklyProgress> weeklyProgress;
        public List<TypeAccuracy> typeAccuracy;
        public WeaknessAnalysis weaknessAnalysis;
    }

    public static class WeeklyProgress {
        public Integer weekNumber;
        public String status;
        public Integer questionCount;
        public Integer correctCount;
        public Integer earnedScore;
        public Integer totalScore;
        public Float scoreRate;      // 득점률 (%)
        public Float correctRate;    // 기존 호환용
    }

    public static class TypeAccuracy {
        public String questionType;
        public Integer totalQuestions;
        public Integer correctCount;
        public Float accuracy;
    }

    public static class WeaknessAnalysis {
        public Integer totalWeak;
        public List<String> weakTags;
        public List<FeedbackItem> feedbackList;
    }

    public static class FeedbackItem {
        public String questionText;
        public String feedback;
        public Boolean isCorrect;
        public Integer score;
        public Integer maxScore;
        public String correctAnswer;
        public String userAnswer;
        public String questionType;
    }
}
