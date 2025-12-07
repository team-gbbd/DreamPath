package com.dreampath.domain.career.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {
    private String sessionId;
    private String message;
    private String role;
    private Long timestamp;

    /**
     * 실시간 정체성 상태 (선택적)
     */
    private IdentityStatus identityStatus;

    /**
     * 단계가 변경되었는지 여부
     */
    private Boolean stageChanged;

    /**
     * AI 에이전트 액션 (선택적)
     * 대화 분석 결과 멘토링/학습경로 등을 제안할 때 포함됨
     */
    private AgentAction agentAction;
}

