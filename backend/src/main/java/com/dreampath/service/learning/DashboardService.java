package com.dreampath.service.learning;

import com.dreampath.entity.learning.LearningPath;
import com.dreampath.entity.learning.StudentAnswer;
import com.dreampath.entity.learning.WeeklyQuestion;
import com.dreampath.entity.learning.WeeklySession;
import com.dreampath.enums.QuestionType;
import com.dreampath.enums.WeeklyStatus;
import com.dreampath.repository.learning.StudentAnswerRepository;
import com.dreampath.repository.learning.WeeklyQuestionRepository;
import com.dreampath.repository.learning.WeeklySessionRepository;
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

        DashboardData dashboard = new DashboardData();
        dashboard.pathId = pathId;
        dashboard.domain = path.getDomain();
        dashboard.status = path.getStatus().name();
        dashboard.totalQuestions = path.getTotalQuestions();
        dashboard.answeredQuestions = answers.size();
        dashboard.correctCount = path.getCorrectCount();
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

            // 정답 개수 계산
            int correctAnswers = 0;
            if (progress.questionCount > 0) {
                int totalScore = questions.stream().mapToInt(WeeklyQuestion::getMaxScore).sum();
                int earnedScore = weekAnswers.stream()
                        .mapToInt(a -> a.getScore() != null ? a.getScore() : 0)
                        .sum();
                progress.correctRate = totalScore > 0 ? (float) earnedScore / totalScore * 100 : 0.0f;

                // 60% 이상이면 정답으로 간주
                correctAnswers = (int) weekAnswers.stream()
                        .filter(a -> a.getScore() != null && a.getQuestion().getMaxScore() > 0
                                && (float) a.getScore() / a.getQuestion().getMaxScore() >= 0.6f)
                        .count();
            } else {
                progress.correctRate = 0.0f;
            }
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
        List<String> weakTags = new ArrayList<>();

        // 낮은 점수를 받은 문제 유형 찾기
        List<TypeAccuracy> typeAccuracyList = calculateTypeAccuracy(answers);
        typeAccuracyList.forEach(typeAcc -> {
            if (typeAcc.accuracy < 60.0f) {
                weakTags.add(typeAcc.questionType + " 유형 (정답률: " + String.format("%.1f", typeAcc.accuracy) + "%)");
            }
        });

        // 오답이 많은 문제들의 공통점 찾기
        List<StudentAnswer> wrongAnswers = answers.stream()
                .filter(a -> {
                    if (a.getScore() == null || a.getQuestion().getMaxScore() == null) return false;
                    return (float) a.getScore() / a.getQuestion().getMaxScore() < 0.6f;
                })
                .collect(Collectors.toList());

        if (wrongAnswers.size() >= 3) {
            weakTags.add("전반적인 이해도 향상 필요 (오답 " + wrongAnswers.size() + "개)");
        }

        WeaknessAnalysis analysis = new WeaknessAnalysis();
        analysis.totalWeak = weakTags.size();
        analysis.weakTags = weakTags;

        return analysis;
    }

    public static class DashboardData {
        public Long pathId;
        public String domain;
        public String status;
        public Integer totalQuestions;
        public Integer answeredQuestions;
        public Integer correctCount;
        public Float correctRate;
        public List<WeeklyProgress> weeklyProgress;
        public List<TypeAccuracy> typeAccuracy;
        public WeaknessAnalysis weaknessAnalysis;
    }

    public static class WeeklyProgress {
        public Integer weekNumber;
        public String status;
        public Integer questionCount;
        public Integer correctCount;
        public Float correctRate;
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
    }
}
