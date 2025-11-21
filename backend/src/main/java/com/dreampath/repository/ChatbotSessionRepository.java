package com.dreampath.repository;

import com.dreampath.entity.ChatbotSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ChatbotSessionRepository extends JpaRepository<ChatbotSession, UUID> {
}
