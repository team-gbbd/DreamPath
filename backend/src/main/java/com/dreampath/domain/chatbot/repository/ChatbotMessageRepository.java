package com.dreampath.domain.chatbot.repository;

import com.dreampath.domain.chatbot.entity.ChatbotMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChatbotMessageRepository extends JpaRepository<ChatbotMessage, UUID> {

    List<ChatbotMessage> findBySession_IdOrderByCreatedAtAsc(UUID sessionId);
}
