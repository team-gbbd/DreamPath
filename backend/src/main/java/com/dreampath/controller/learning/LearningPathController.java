package com.dreampath.controller.learning;

import com.dreampath.dto.learning.*;
import com.dreampath.entity.User;
import com.dreampath.entity.dw.CareerAnalysis;
import com.dreampath.entity.learning.LearningPath;
import com.dreampath.entity.learning.StudentAnswer;
import com.dreampath.entity.learning.WeeklyQuestion;
import com.dreampath.entity.learning.WeeklySession;
import com.dreampath.exception.ResourceNotFoundException;
import com.dreampath.repository.UserRepository;
import com.dreampath.repository.dw.CareerAnalysisRepository;
import com.dreampath.service.learning.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/learning-paths")
@RequiredArgsConstructor
public class LearningPathController {

    private final LearningPathService learningPathService;
    private final WeeklySessionService weeklySessionService;
    private final QuestionGeneratorService questionGeneratorService;
    private final AnswerEvaluationService answerEvaluationService;
    private final DashboardService dashboardService;
    private final UserRepository userRepository;
    private final CareerAnalysisRepository careerAnalysisRepository;
    private final com.dreampath.repository.learning.WeeklyQuestionRepository weeklyQuestionRepository;

    /**
     * 로드맵 생성
     * POST /api/learning-paths
     */
    @PostMapping
    public ResponseEntity<LearningPathResponse> createLearningPath(
            @Valid @RequestBody CreateLearningPathRequest request) {
        log.info("로드맵 생성 요청 - userId: {}, domain: {}", request.getUserId(), request.getDomain());

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getUserId()));

        CareerAnalysis analysis = null;
        if (request.getAnalysisId() != null) {
            analysis = careerAnalysisRepository.findById(request.getAnalysisId())
                    .orElseThrow(() -> new ResourceNotFoundException("CareerAnalysis", "id", request.getAnalysisId()));
        }

        LearningPath path = learningPathService.createLearningPath(user, analysis, request.getDomain());
        return ResponseEntity.ok(LearningPathResponse.from(path));
    }

    /**
     * 로드맵 조회
     * GET /api/learning-paths/{pathId}
     */
    @GetMapping("/{pathId}")
    public ResponseEntity<LearningPathResponse> getLearningPath(@PathVariable Long pathId) {
        log.info("로드맵 조회 - pathId: {}", pathId);

        LearningPath path = learningPathService.getLearningPath(pathId);
        return ResponseEntity.ok(LearningPathResponse.from(path));
    }

    /**
     * 사용자의 모든 로드맵 조회
     * GET /api/learning-paths/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<LearningPathResponse>> getUserLearningPaths(@PathVariable Long userId) {
        log.info("사용자 로드맵 조회 - userId: {}", userId);

        List<LearningPath> paths = learningPathService.getUserLearningPaths(userId);
        List<LearningPathResponse> responses = paths.stream()
                .map(LearningPathResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    /**
     * 주차별 문제 AI 생성
     * POST /api/learning-paths/weekly-sessions/{weeklyId}/generate-questions
     */
    @PostMapping("/weekly-sessions/{weeklyId}/generate-questions")
    public ResponseEntity<List<QuestionResponse>> generateQuestions(
            @PathVariable Long weeklyId,
            @Valid @RequestBody GenerateQuestionsRequest request) {
        log.info("문제 생성 요청 - weeklyId: {}, count: {}", weeklyId, request.getCount());

        WeeklySession session = weeklySessionService.getWeeklySession(weeklyId);
        String domain = session.getLearningPath().getDomain();

        List<WeeklyQuestion> questions = questionGeneratorService.generateQuestions(
                session, domain, request.getCount());

        List<QuestionResponse> responses = questions.stream()
                .map(QuestionResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    /**
     * 주차별 문제 조회
     * GET /api/learning-paths/weekly-sessions/{weeklyId}/questions
     */
    @GetMapping("/weekly-sessions/{weeklyId}/questions")
    public ResponseEntity<List<QuestionResponse>> getSessionQuestions(@PathVariable Long weeklyId) {
        log.info("문제 조회 - weeklyId: {}", weeklyId);

        List<WeeklyQuestion> questions = questionGeneratorService.getSessionQuestions(weeklyId);
        List<QuestionResponse> responses = questions.stream()
                .map(QuestionResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    /**
     * 답변 제출
     * POST /api/learning-paths/questions/{questionId}/submit
     */
    @PostMapping("/questions/{questionId}/submit")
    public ResponseEntity<AnswerResponse> submitAnswer(
            @PathVariable Long questionId,
            @Valid @RequestBody SubmitAnswerRequest request) {
        log.info("답변 제출 - questionId: {}, userId: {}", questionId, request.getUserId());

        WeeklyQuestion question = weeklyQuestionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("WeeklyQuestion", "id", questionId));

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getUserId()));

        StudentAnswer answer = answerEvaluationService.submitAnswer(question, user, request.getAnswer());
        return ResponseEntity.ok(AnswerResponse.from(answer));
    }

    /**
     * 주차 완료
     * POST /api/learning-paths/weekly-sessions/{weeklyId}/complete
     */
    @PostMapping("/weekly-sessions/{weeklyId}/complete")
    public ResponseEntity<Void> completeSession(@PathVariable Long weeklyId) {
        log.info("주차 완료 - weeklyId: {}", weeklyId);
        weeklySessionService.completeSession(weeklyId);
        return ResponseEntity.ok().build();
    }

    /**
     * 대시보드 조회
     * GET /api/learning-paths/{pathId}/dashboard
     */
    @GetMapping("/{pathId}/dashboard")
    public ResponseEntity<DashboardService.DashboardData> getDashboard(
            @PathVariable Long pathId) {
        log.info("대시보드 조회 - pathId: {}", pathId);

        DashboardService.DashboardData dashboard = dashboardService.getDashboard(pathId);
        return ResponseEntity.ok(dashboard);
    }
}
