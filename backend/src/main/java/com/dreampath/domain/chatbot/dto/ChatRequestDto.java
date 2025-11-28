package com.dreampath.domain.chatbot.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class ChatRequestDto {

    private UUID sessionId;          // 기존 세션 아이디 (처음엔 null)
    private Long userId;             // 회원 ID (users 테이블의 userId, 비회원이면 null)
    private String guestId;          // 비회원 게스트 ID (로그인 안 했으면 프론트에서 생성해서 전달)
    private String message;          // 사용자가 입력한 메시지
    private String conversationTitle; // 대화 제목 (처음 생성할 때만 사용)
}
