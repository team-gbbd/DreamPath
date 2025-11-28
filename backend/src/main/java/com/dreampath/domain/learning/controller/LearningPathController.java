package com.dreampath.domain.learning.controller;

import com.dreampath.domain.career.repository.CareerSessionRepository;
import com.dreampath.domain.learning.dto.*;
import com.dreampath.domain.learning.repository.WeeklyQuestionRepository;
import com.dreampath.domain.learning.service.*;
import com.dreampath.domain.user.entity.User;
import com.dreampath.domain.career.entity.CareerAnalysis;
import com.dreampath.domain.learning.entity.LearningPath;
import com.dreampath.domain.learning.entity.StudentAnswer;
import com.dreampath.domain.learning.entity.WeeklyQuestion;
import com.dreampath.domain.learning.entity.WeeklySession;
import com.dreampath.global.exception.ResourceNotFoundException;
import com.dreampath.domain.user.repository.UserRepository;
import com.dreampath.domain.career.repository.CareerAnalysisRepository;
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
    private final CareerToLearningDomainMapper careerDomainMapper;
    private final UserRepository userRepository;
    private final CareerAnalysisRepository careerAnalysisRepository;
    private final WeeklyQuestionRepository weeklyQuestionRepository;
    private final CareerSessionRepository careerSessionRepository;

    /**
     * 진로 상담 결과에서 직업 선택 후 학습 경로 생성
     * POST /api/learning-paths/from-career
     */
    @PostMapping("/from-career")
    public ResponseEntity<CareerSelectionResponse> createLearningPathFromCareer(
            @Valid @RequestBody CareerSelectionRequest request) {
        log.info("직업 선택 기반 로드맵 생성 요청 - userId: {}, sessionId: {}, selectedCareer: {}",
                request.getUserId(), request.getSessionId(), request.getSelectedCareer());

        try {
            // 1. 사용자 조회
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getUserId()));

            // 2. sessionId가 있으면 CareerAnalysis 조회, 없으면 null
            CareerAnalysis analysis = null;
            if (request.getSessionId() != null && !request.getSessionId().isBlank()) {
                var session = careerSessionRepository.findBySessionId(request.getSessionId())
                        .orElse(null);

                if (session != null) {
                    analysis = careerAnalysisRepository.findBySession(session)
                            .orElse(null);
                    log.info("CareerAnalysis 연결됨 - analysisId: {}", analysis != null ? analysis.getId() : "null");
                } else {
                    log.warn("sessionId가 제공되었지만 CareerSession을 찾을 수 없음: {}", request.getSessionId());
                }
            } else {
                log.info("sessionId가 제공되지 않음 - CareerAnalysis 없이 학습 경로 생성");
            }

            // 3. 직업명 → 학습 도메인 매핑
            String learningDomain = careerDomainMapper.mapCareerToDomain(request.getSelectedCareer());
            log.info("직업 '{}' → 학습 도메인 '{}'로 매핑됨", request.getSelectedCareer(), learningDomain);

            // 4. 학습 경로 생성 (analysis는 null일 수 있음)
            LearningPath path = learningPathService.createLearningPath(user, analysis, learningDomain);

            // 5. 응답 생성
            return ResponseEntity.ok(CareerSelectionResponse.builder()
                    .learningPathId(path.getPathId())
                    .selectedCareer(request.getSelectedCareer())
                    .learningDomain(learningDomain)
                    .totalWeeks(path.getWeeklySessions() != null ? path.getWeeklySessions().size() : 0)
                    .message("학습 경로가 성공적으로 생성되었습니다.")
                    .build());

        } catch (ResourceNotFoundException e) {
            log.error("리소스를 찾을 수 없음: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("학습 경로 생성 중 오류 발생", e);
            throw new RuntimeException("학습 경로 생성에 실패했습니다: " + e.getMessage());
        }
    }

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
