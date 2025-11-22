package com.dreampath.repository.chatbot;

import com.dreampath.entity.chatbot.ChatbotMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChatbotMessageRepository extends JpaRepository<ChatbotMessage, UUID> {

    List<ChatbotMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
}
