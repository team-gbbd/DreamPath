package com.dreampath.domain.learning.service;

import com.dreampath.domain.user.entity.User;
import com.dreampath.domain.learning.entity.StudentAnswer;
import com.dreampath.domain.learning.entity.WeeklyQuestion;
import com.dreampath.global.exception.ResourceNotFoundException;
import com.dreampath.domain.learning.repository.StudentAnswerRepository;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnswerEvaluationService {

    private final StudentAnswerRepository answerRepository;

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.model:gpt-4o-mini}")
    private String modelName;

    private ChatLanguageModel chatModel;

    @PostConstruct
    public void init() {
        this.chatModel = OpenAiChatModel.builder()
                .apiKey(apiKey)
                .modelName(modelName)
                .temperature(0.3)  // 채점은 일관성이 중요
                .build();
    }

    @Transactional
    public StudentAnswer submitAnswer(WeeklyQuestion question, User user, String userAnswer) {
        log.info("답안 제출 - 문제: {}, 학생: {}", question.getQuestionId(), user.getUserId());

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

        // AI 채점
        EvaluationResult result = evaluateAnswer(question, userAnswer);
        answer.setScore(result.score);
        answer.setAiFeedback(result.feedback);

        return answerRepository.save(answer);
    }

    private EvaluationResult evaluateAnswer(WeeklyQuestion question, String userAnswer) {
        // MCQ는 직접 비교로 채점 (AI 불필요)
        if (question.getQuestionType() == com.dreampath.global.enums.QuestionType.MCQ &&
            question.getCorrectAnswer() != null && !question.getCorrectAnswer().isEmpty()) {
            return evaluateMCQ(question, userAnswer);
        }

        // 나머지 유형은 AI 채점
        String prompt = buildEvaluationPrompt(question, userAnswer);
        String response = chatModel.generate(prompt);

        return parseEvaluationResult(response, question.getMaxScore());
    }

    private EvaluationResult evaluateMCQ(WeeklyQuestion question, String userAnswer) {
        EvaluationResult result = new EvaluationResult();

        // 정답과 비교 (대소문자 무시, 공백 제거)
        String correctAnswer = question.getCorrectAnswer().trim().toLowerCase();
        String studentAnswer = userAnswer.trim().toLowerCase();

        boolean isCorrect = correctAnswer.equals(studentAnswer);
        result.score = isCorrect ? question.getMaxScore() : 0;

        // AI로 개념 설명 피드백 생성
        result.feedback = generateMCQFeedback(question, userAnswer, isCorrect);

        return result;
    }

    private String generateMCQFeedback(WeeklyQuestion question, String userAnswer, boolean isCorrect) {
        try {
            String prompt = String.format("""
                당신은 친절한 학습 도우미입니다.

                문제: %s
                선택지: %s
                정답: %s
                학생 답변: %s
                정답 여부: %s

                %s

                피드백 작성 규칙:
                - 2-3문장으로 간결하게
                - 핵심 개념을 명확히 설명
                - 암기가 아닌 이해를 돕는 설명
                - 관련된 추가 개념이나 팁 제공
                """,
                question.getQuestionText(),
                question.getOptions() != null ? question.getOptions() : "없음",
                question.getCorrectAnswer(),
                userAnswer,
                isCorrect ? "정답" : "오답",
                isCorrect
                    ? "정답을 맞췄지만, 찍어서 맞췄을 수도 있으니 이 문제의 핵심 개념을 설명해주세요."
                    : "오답입니다. 왜 정답이 맞는지, 학생이 선택한 답이 왜 틀린지 설명해주세요."
            );

            String response = chatModel.generate(prompt);

            String prefix = isCorrect
                ? "✓ 정답!\n\n"
                : "✗ 오답\n정답: " + question.getCorrectAnswer() + "\n\n";
            return prefix + response.trim();

        } catch (Exception e) {
            log.error("MCQ 피드백 생성 오류: {}", e.getMessage());
            if (isCorrect) {
                return "정답입니다! 잘하셨습니다.";
            } else {
                return String.format("오답입니다. 정답은 '%s'입니다.", question.getCorrectAnswer());
            }
        }
    }

    private String buildEvaluationPrompt(WeeklyQuestion question, String userAnswer) {
        String correctAnswerInfo = "";
        if (question.getCorrectAnswer() != null && !question.getCorrectAnswer().isEmpty()) {
            correctAnswerInfo = String.format("정답: %s\n", question.getCorrectAnswer());
        }

        return String.format("""
            당신은 공정하고 정확한 채점자입니다.

            문제 유형: %s
            난이도: %s
            문제: %s
            %s학생 답변: %s
            만점: %d점

            다음 형식으로 채점해주세요:
            점수: [0-%d]
            피드백: [구체적인 피드백 2-3문장]

            채점 기준:
            - MCQ: 정답과 정확히 일치하면 만점, 불일치하면 0점
            - SCENARIO/CODING/DESIGN: 내용의 정확성, 완성도, 창의성을 종합 평가
            - 부분 점수 가능 (MCQ 제외)
            - 피드백은 건설적이고 구체적으로
            - MCQ의 경우 정답과 학생 답변을 비교하여 정확히 판단
            """,
            question.getQuestionType(),
            question.getDifficulty(),
            question.getQuestionText(),
            correctAnswerInfo,
            userAnswer,
            question.getMaxScore(),
            question.getMaxScore()
        );
    }

    private EvaluationResult parseEvaluationResult(String response, int maxScore) {
        EvaluationResult result = new EvaluationResult();

        try {
            // "점수: 80" 형식에서 점수 추출
            String[] lines = response.split("\n");
            for (String line : lines) {
                if (line.startsWith("점수:")) {
                    String scoreStr = line.substring(3).trim().replaceAll("[^0-9]", "");
                    result.score = Math.min(Integer.parseInt(scoreStr), maxScore);
                } else if (line.startsWith("피드백:")) {
                    result.feedback = line.substring(4).trim();
                }
            }

            // 피드백이 여러 줄인 경우
            if (result.feedback == null || result.feedback.isEmpty()) {
                int feedbackStart = response.indexOf("피드백:");
                if (feedbackStart >= 0) {
                    result.feedback = response.substring(feedbackStart + 4).trim();
                }
            }

        } catch (Exception e) {
            log.error("채점 결과 파싱 오류: {}", e.getMessage());
            result.score = 0;
            result.feedback = "채점 중 오류가 발생했습니다.";
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
