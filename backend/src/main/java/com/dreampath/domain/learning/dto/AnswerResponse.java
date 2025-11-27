package com.dreampath.domain.learning.dto;

import com.dreampath.domain.learning.entity.StudentAnswer;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class AnswerResponse {

    private Long answerId;
    private Long questionId;
    private String userAnswer;
    private String aiFeedback;
    private Integer score;
    private Integer maxScore;
    private LocalDateTime submittedAt;

    public static AnswerResponse from(StudentAnswer answer) {
        AnswerResponse response = new AnswerResponse();
        response.answerId = answer.getAnswerId();
        response.questionId = answer.getQuestion().getQuestionId();
        response.userAnswer = answer.getUserAnswer();
        response.aiFeedback = answer.getAiFeedback();
        response.score = answer.getScore();
        response.maxScore = answer.getQuestion().getMaxScore();
        response.submittedAt = answer.getSubmittedAt();
        return response;
    }
}
