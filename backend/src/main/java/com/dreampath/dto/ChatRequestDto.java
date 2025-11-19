package com.dreampath.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class ChatRequestDto {

    private UUID sessionId;          // 기존 세션 아이디 (처음엔 null)
    private UUID userId;             // 회원/비회원 UUID
    private String message;          // 사용자가 입력한 메시지
    private String conversationTitle; // 대화 제목 (처음 생성할 때만 사용)
}
