package com.dreampath.service;

import com.dreampath.dto.ChatRequestDto;
import com.dreampath.entity.ChatbotMessage;
import com.dreampath.entity.ChatbotSession;
import com.dreampath.repository.ChatbotMessageRepository;
import com.dreampath.repository.ChatbotSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final ChatbotSessionRepository sessionRepository;
    private final ChatbotMessageRepository messageRepository;
    private final OpenAIService openAIService;

    public UUID handleMessage(ChatRequestDto dto) {

        UUID sessionId = dto.getSessionId();

        if (sessionId == null) {
            ChatbotSession newSession = new ChatbotSession();
            newSession.setId(UUID.randomUUID());
            newSession.setUser_id(dto.getUserId());
            newSession.setConversation_title(dto.getConversationTitle());
            newSession.setCreated_at(LocalDateTime.now());

            sessionRepository.save(newSession);
            sessionId = newSession.getId();
        }

        ChatbotMessage msg = new ChatbotMessage();
        msg.setSession_id(sessionId);
        msg.setUser_id(dto.getUserId());
        msg.setRole("user");
        msg.setMessage(dto.getMessage());
        msg.setCreated_at(LocalDateTime.now());

        messageRepository.save(msg);

        return sessionId;
    }

    // ⭐️ 여기에서 실제 AI 답변 생성
    public String generateAnswer(UUID sessionId, String message) {
        return openAIService.generate(message);
    }

    public void saveAssistantMessage(UUID sessionId, UUID userId, String answer) {
        ChatbotMessage msg = new ChatbotMessage();
        msg.setSession_id(sessionId);
        msg.setUser_id(userId);
        msg.setRole("assistant");
        msg.setMessage(answer);
        msg.setCreated_at(LocalDateTime.now());

        messageRepository.save(msg);
    }
}



