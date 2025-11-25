package com.dreampath.repository.chatbot;

import com.dreampath.entity.chatbot.ChatbotSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ChatbotSessionRepository extends JpaRepository<ChatbotSession, UUID> {
}
