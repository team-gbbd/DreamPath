package com.dreampath.domain.chatbot.entity;

import com.dreampath.domain.user.entity.User;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cb_session_id", referencedColumnName = "id")
    private ChatbotSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cb_user_id", referencedColumnName = "userId", nullable = true)
    private User user; // 로그인 사용자

    @Column(name = "guest_id")
    private String guestId; // 비회원 게스트 ID

    private String role;

    @Column(columnDefinition = "text")
    private String message;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
