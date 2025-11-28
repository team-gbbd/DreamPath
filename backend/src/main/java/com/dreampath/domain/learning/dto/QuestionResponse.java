package com.dreampath.domain.learning.dto;

import com.dreampath.domain.learning.entity.StudentAnswer;
import com.dreampath.domain.learning.entity.WeeklyQuestion;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class QuestionResponse {

    private Long questionId;
    private String questionType;
    private String difficulty;
    private Integer maxScore;
    private Integer orderNum;
    private String questionText;
    private String options;
    private LocalDateTime createdAt;

    // 기존 제출 답안 정보
    private SubmittedAnswerInfo submittedAnswer;

    @Getter
    @Setter
    public static class SubmittedAnswerInfo {
        private Long answerId;
        private String userAnswer;
        private Integer score;
        private String aiFeedback;
        private LocalDateTime submittedAt;

        public static SubmittedAnswerInfo from(StudentAnswer answer) {
            SubmittedAnswerInfo info = new SubmittedAnswerInfo();
            info.answerId = answer.getAnswerId();
            info.userAnswer = answer.getUserAnswer();
            info.score = answer.getScore();
            info.aiFeedback = answer.getAiFeedback();
            info.submittedAt = answer.getSubmittedAt();
            return info;
        }
    }

    public static QuestionResponse from(WeeklyQuestion question) {
        return from(question, null);
    }

    public static QuestionResponse from(WeeklyQuestion question, StudentAnswer existingAnswer) {
        QuestionResponse response = new QuestionResponse();
        response.questionId = question.getQuestionId();
        response.questionType = question.getQuestionType().name();
        response.difficulty = question.getDifficulty().name();
        response.maxScore = question.getMaxScore();
        response.orderNum = question.getOrderNum();
        response.questionText = question.getQuestionText();
        response.options = question.getOptions();
        response.createdAt = question.getCreatedAt();

        if (existingAnswer != null) {
            response.submittedAnswer = SubmittedAnswerInfo.from(existingAnswer);
        }

        return response;
    }
}
