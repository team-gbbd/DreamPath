package com.dreampath.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "chatbot_sessions")
public class ChatbotSession {

    @Id
    private UUID id;

    private UUID user_id;

    private String conversation_title;

    private LocalDateTime created_at;
}
