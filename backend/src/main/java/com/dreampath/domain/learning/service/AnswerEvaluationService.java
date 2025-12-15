package com.dreampath.domain.learning.service;

import com.dreampath.domain.user.entity.User;
import com.dreampath.domain.learning.entity.StudentAnswer;
import com.dreampath.domain.learning.entity.WeeklyQuestion;
import com.dreampath.global.exception.ResourceNotFoundException;
import com.dreampath.domain.learning.repository.StudentAnswerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnswerEvaluationService {

    private final StudentAnswerRepository answerRepository;
    private final RestTemplate restTemplate;

    @Value("${python.ai.service.url:http://localhost:8000}")
    private String pythonServiceUrl;

    // Self-injection for @Transactional proxy to work
    @org.springframework.context.annotation.Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private AnswerEvaluationService self;

    /**
     * 답안 제출 및 채점 - 커넥션 누수 방지를 위해 트랜잭션 분리
     * HTTP 호출은 트랜잭션 밖에서 수행
     */
    public StudentAnswer submitAnswer(WeeklyQuestion question, User user, String userAnswer) {
        log.info("답안 제출 - 문제: {}, 학생: {}", question.getQuestionId(), user.getUserId());

        // 1. Python AI Service로 채점 (트랜잭션 밖 - 시간이 오래 걸릴 수 있음)
        EvaluationResult result = callPythonEvaluationService(question, userAnswer);

        // 2. 답안 저장 (짧은 트랜잭션 - self를 통해 호출해야 프록시가 동작)
        return self.saveAnswer(question, user, userAnswer, result);
    }

    @Transactional
    public StudentAnswer saveAnswer(WeeklyQuestion question, User user, String userAnswer, EvaluationResult result) {
        // 중복 제출 확인
        Optional<StudentAnswer> existing = answerRepository
                .findByQuestionQuestionIdAndUserUserId(question.getQuestionId(), user.getUserId());

        StudentAnswer answer;
        if (existing.isPresent()) {
            answer = existing.get();
            answer.setUserAnswer(userAnswer);
        } else {
            answer = new StudentAnswer();
            answer.setQuestion(question);
            answer.setUser(user);
            answer.setUserAnswer(userAnswer);
        }

        answer.setScore(result.score);
        answer.setAiFeedback(result.feedback);

        return answerRepository.save(answer);
    }

    private EvaluationResult callPythonEvaluationService(WeeklyQuestion question, String userAnswer) {
        String url = pythonServiceUrl + "/api/learning/evaluate-answer";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = Map.of(
            "questionType", question.getQuestionType().name(),
            "question", question.getQuestionText(),
            "correctAnswer", question.getCorrectAnswer() != null ? question.getCorrectAnswer() : "",
            "userAnswer", userAnswer,
            "maxScore", question.getMaxScore()
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        try {
            log.info("Python AI Service 채점 요청: {}", url);
            ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                request,
                Map.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();

                EvaluationResult result = new EvaluationResult();

                // score 처리 (Integer 또는 Double 가능)
                Object scoreObj = body.get("score");
                if (scoreObj instanceof Integer) {
                    result.score = (Integer) scoreObj;
                } else if (scoreObj instanceof Double) {
                    result.score = ((Double) scoreObj).intValue();
                } else {
                    result.score = 0;
                }

                result.feedback = (String) body.get("feedback");

                log.info("Python AI Service 채점 완료 - 점수: {}", result.score);
                return result;
            }

            throw new RuntimeException("Python AI Service 응답 오류");

        } catch (Exception e) {
            log.error("Python AI Service 채점 실패: {}", e.getMessage());
            // 폴백: 기본 채점
            return fallbackEvaluation(question, userAnswer);
        }
    }

    /**
     * Python 서비스 실패 시 폴백 채점 (MCQ만 지원)
     */
    private EvaluationResult fallbackEvaluation(WeeklyQuestion question, String userAnswer) {
        EvaluationResult result = new EvaluationResult();

        if (question.getQuestionType() == com.dreampath.global.enums.QuestionType.MCQ
            && question.getCorrectAnswer() != null) {

            String correctAnswer = question.getCorrectAnswer().trim().toLowerCase();
            String studentAnswer = userAnswer.trim().toLowerCase();
            boolean isCorrect = correctAnswer.equals(studentAnswer);

            result.score = isCorrect ? question.getMaxScore() : 0;
            result.feedback = isCorrect
                ? "정답입니다!"
                : "오답입니다. 정답은 '" + question.getCorrectAnswer() + "'입니다.";
        } else {
            result.score = 0;
            result.feedback = "채점 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
        }

        return result;
    }

    @Transactional(readOnly = true)
    public StudentAnswer getStudentAnswer(Long questionId, Long userId) {
        return answerRepository.findByQuestionQuestionIdAndUserUserId(questionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("StudentAnswer", "questionId and userId", questionId + ", " + userId));
    }

    private static class EvaluationResult {
        int score;
        String feedback;
    }
}
