package com.dreampath.domain.career.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {
    private String sessionId;
    private String message;
    private String userId;

    /**
     * 현재 정체성 상태 (프론트엔드에서 전달)
     */
    private IdentityStatus identityStatus;
}

