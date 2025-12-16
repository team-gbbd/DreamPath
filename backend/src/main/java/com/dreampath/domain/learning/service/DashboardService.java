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
    private final WeaknessAnalysisService weaknessAnalysisService;
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

        // 약점 분석 (기존 피드백 기반)
        dashboard.weaknessAnalysis = analyzeWeaknesses(answers);

        // AI 약점 분석 - DB에서 먼저 조회
        List<StudentAnswer> wrongAnswers = answers.stream()
                .filter(a -> a.getScore() != null && a.getQuestion().getMaxScore() != null
                        && (float) a.getScore() / a.getQuestion().getMaxScore() < 0.6f)
                .collect(Collectors.toList());

        if (wrongAnswers.size() >= 3) {
            // DB에서 저장된 분석 결과 조회
            Optional<WeaknessAnalysisService.WeaknessAnalysisResult> savedAnalysis =
                    weaknessAnalysisService.getSavedAnalysis(pathId);

            if (savedAnalysis.isPresent()) {
                dashboard.aiWeaknessAnalysis = convertToAIAnalysis(savedAnalysis.get());
                log.info("저장된 약점 분석 결과 사용 - pathId: {}", pathId);
            } else {
                // 저장된 결과가 없으면 기본값 표시 (분석은 퀴즈 완료 시에만)
                dashboard.aiWeaknessAnalysis = getDefaultAIAnalysis();
                dashboard.aiWeaknessAnalysis.overallAnalysis =
                        "아직 분석이 완료되지 않았습니다. 퀴즈를 완료하면 상세 분석이 제공됩니다.";
            }
        } else {
            dashboard.aiWeaknessAnalysis = getDefaultAIAnalysis();
        }

        return dashboard;
    }

    private AIWeaknessAnalysis convertToAIAnalysis(WeaknessAnalysisService.WeaknessAnalysisResult result) {
        AIWeaknessAnalysis analysis = new AIWeaknessAnalysis();

        for (WeaknessAnalysisService.WeaknessTag tag : result.weaknessTags) {
            WeaknessTagItem item = new WeaknessTagItem();
            item.tag = tag.tag;
            item.count = tag.count;
            item.severity = tag.severity;
            item.description = tag.description;
            analysis.weaknessTags.add(item);
        }

        analysis.recommendations = new ArrayList<>(result.recommendations);
        analysis.overallAnalysis = result.overallAnalysis;

        for (WeaknessAnalysisService.RadarDataItem rd : result.radarData) {
            RadarDataItem item = new RadarDataItem();
            item.category = rd.category;
            item.score = rd.score;
            item.fullMark = rd.fullMark;
            analysis.radarData.add(item);
        }

        return analysis;
    }

    private AIWeaknessAnalysis getDefaultAIAnalysis() {
        AIWeaknessAnalysis analysis = new AIWeaknessAnalysis();
        analysis.overallAnalysis = "오답 데이터가 충분하지 않아 상세 분석이 제공되지 않습니다. 학습을 계속 진행해주세요!";
        analysis.recommendations.add("꾸준히 학습을 진행해주세요");

        String[] categories = {"기초 이론", "실무 적용", "문제 해결", "최신 트렌드", "종합 사고"};
        for (String cat : categories) {
            RadarDataItem item = new RadarDataItem();
            item.category = cat;
            item.score = 80;
            item.fullMark = 100;
            analysis.radarData.add(item);
        }

        return analysis;
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

            // 점수 계산 - DB에 저장된 값 사용 (WeeklySession이 source of truth)
            int totalScore = session.getTotalScore() != null ? session.getTotalScore() :
                    questions.stream().mapToInt(WeeklyQuestion::getMaxScore).sum();
            int earnedScore = session.getEarnedScore() != null ? session.getEarnedScore() : 0;

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
        public AIWeaknessAnalysis aiWeaknessAnalysis;  // AI 약점 분석 결과
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

    // AI 약점 분석 결과 DTO
    public static class AIWeaknessAnalysis {
        public List<WeaknessTagItem> weaknessTags = new ArrayList<>();
        public List<String> recommendations = new ArrayList<>();
        public String overallAnalysis = "";
        public List<RadarDataItem> radarData = new ArrayList<>();
    }

    public static class WeaknessTagItem {
        public String tag;
        public Integer count;
        public String severity;  // high, medium, low
        public String description;
    }

    public static class RadarDataItem {
        public String category;
        public Integer score;
        public Integer fullMark;
    }
}
