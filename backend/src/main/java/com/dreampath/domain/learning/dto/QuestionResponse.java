package com.dreampath.domain.learning.dto;

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

    public static QuestionResponse from(WeeklyQuestion question) {
        QuestionResponse response = new QuestionResponse();
        response.questionId = question.getQuestionId();
        response.questionType = question.getQuestionType().name();
        response.difficulty = question.getDifficulty().name();
        response.maxScore = question.getMaxScore();
        response.orderNum = question.getOrderNum();
        response.questionText = question.getQuestionText();
        response.options = question.getOptions();
        response.createdAt = question.getCreatedAt();
        return response;
    }
}
