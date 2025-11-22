package com.dreampath.entity.chatbot;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chatbot_sessions")
@Getter @Setter
public class ChatbotSession {

    @Id
    private UUID id;

    @Column(name = "cb_user_id")
    private UUID userId;

    @Column(name = "conversation_title")
    private String conversationTitle;

    @Column(name = "conversation_stage")
    private String conversationStage;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}


