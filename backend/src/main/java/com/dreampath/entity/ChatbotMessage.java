package com.dreampath.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chatbot_messages")
@Getter
@Setter
public class ChatbotMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "cb_session_id")
    private UUID sessionId;

    @Column(name = "cb_user_id")
    private UUID userId;

    private String role;

    @Column(columnDefinition = "text")
    private String message;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
