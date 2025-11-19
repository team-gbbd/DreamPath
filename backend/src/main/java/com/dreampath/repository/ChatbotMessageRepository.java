package com.dreampath.repository;

import com.dreampath.entity.ChatbotMessage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatbotMessageRepository extends JpaRepository<ChatbotMessage, Long> {

}
