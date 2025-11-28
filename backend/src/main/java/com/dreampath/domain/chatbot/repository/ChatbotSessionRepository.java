package com.dreampath.domain.chatbot.repository;

import com.dreampath.domain.chatbot.entity.ChatbotSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ChatbotSessionRepository extends JpaRepository<ChatbotSession, UUID> {
}
