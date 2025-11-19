package com.dreampath.service;

import com.dreampath.dto.ChatRequestDto;
import com.dreampath.entity.ChatbotMessage;
import com.dreampath.entity.ChatbotSession;
import com.dreampath.repository.ChatbotMessageRepository;
import com.dreampath.repository.ChatbotSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final ChatbotSessionRepository sessionRepository;
    private final ChatbotMessageRepository messageRepository;
    private final OpenAIService openAIService;

    // 📌 1) 사용자 메시지 저장 + 세션 생성
    public UUID handleMessage(ChatRequestDto dto) {

        UUID sessionId = dto.getSessionId();

        if (sessionId == null) {
            ChatbotSession newSession = new ChatbotSession();
            newSession.setId(UUID.randomUUID());
            newSession.setUserId(dto.getUserId());
            newSession.setConversationTitle(dto.getConversationTitle());
            newSession.setCreatedAt(LocalDateTime.now());

            sessionRepository.save(newSession);
            sessionId = newSession.getId();
        }

        ChatbotMessage msg = new ChatbotMessage();
        msg.setSessionId(sessionId);
        msg.setUserId(dto.getUserId());
        msg.setRole("user");
        msg.setMessage(dto.getMessage());
        msg.setCreatedAt(LocalDateTime.now());

        messageRepository.save(msg);

        return sessionId;
    }

    public String generateAnswer(UUID sessionId, String message) {
        // 세션Id는 지금은 안 쓰더라도 향후 대화 이력이나 문맥 반영에 필요
        return openAIService.generate(message);
    }


    // 📌 3) AI 메시지 저장
    public void saveAssistantMessage(UUID sessionId, UUID userId, String answer) {
        ChatbotMessage msg = new ChatbotMessage();
        msg.setSessionId(sessionId);
        msg.setUserId(userId);
        msg.setRole("assistant");
        msg.setMessage(answer);
        msg.setCreatedAt(LocalDateTime.now());

        messageRepository.save(msg);
    }

    // 📌 4) 세션 메시지 전체 조회
    public List<ChatbotMessage> getChatHistory(UUID sessionId) {
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }


}
