package com.dreampath.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chatbot_sessions")
@Getter
@Setter
public class ChatbotSession {

    @Id
    private UUID id;   // 직접 생성하는 방식으로 변경

    @Column(name = "cb_user_id")
    private UUID userId;

    @Column(name = "conversation_title")
    private String conversationTitle;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}

