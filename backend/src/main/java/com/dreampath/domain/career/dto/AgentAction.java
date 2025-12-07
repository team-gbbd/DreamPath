package com.dreampath.domain.career.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * AI 에이전트 액션 DTO
 * 진로 상담 중 AI가 프로액티브하게 제안하는 액션 (멘토링, 학습 경로 등)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentAction {

    /**
     * 액션 타입
     * - mentoring_suggestion: 멘토링 세션 제안
     * - learning_path_suggestion: 학습 경로 제안
     * - job_posting_suggestion: 채용공고 제안
     */
    private String type;

    /**
     * 제안 이유 (사용자에게 보여줄 문구)
     * 예: "대화를 보니 UX 디자인 쪽에 관심이 있으시네요!"
     */
    private String reason;

    /**
     * AI 에이전트가 생성한 요약 (LLM이 검색 결과 등을 요약한 자연스러운 문장)
     */
    private String summary;

    /**
     * 액션 데이터 (타입별로 다른 구조)
     * - mentoring_suggestion: { sessions: [...] }
     * - learning_path_suggestion: { career, topics, estimatedWeeks }
     * - job_posting_suggestion: { jobs: [...] }
     */
    private Map<String, Object> data;

    /**
     * 액션 버튼 목록
     */
    private List<ActionButton> actions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActionButton {
        private String id;
        private String label;
        private Boolean primary;
        private Map<String, Object> params;
    }
}
