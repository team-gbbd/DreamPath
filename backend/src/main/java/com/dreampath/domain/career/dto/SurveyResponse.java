package com.dreampath.domain.career.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 설문조사 응답 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SurveyResponse {
    /**
     * 설문조사가 필요한지 여부
     */
    private Boolean needsSurvey;
    
    /**
     * 설문조사 질문 목록
     */
    private List<SurveyQuestion> questions;
    
    /**
     * 설문조사 완료 여부
     */
    private Boolean completed;
    
    /**
     * 세션 ID
     */
    private String sessionId;
    
    /**
     * 설문조사 질문
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SurveyQuestion {
        private String id;
        private String question;
        private String type; // "text", "select", "multiselect"
        private List<String> options; // select, multiselect 타입일 때 사용
        private Boolean required;
    }
}

