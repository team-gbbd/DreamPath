package com.dreampath.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "chatbot_messages")
public class ChatbotMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private UUID session_id;

    private UUID user_id;

    private String role;

    @Column(columnDefinition = "text")
    private String message;

    private LocalDateTime created_at;
}
