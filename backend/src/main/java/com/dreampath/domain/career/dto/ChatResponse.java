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
     * Personality Agent 분석 결과 (선택적)
     * 메시지 12개 이상일 때 자동으로 생성됨
     */
    private Object personalityAgentResult;
}
