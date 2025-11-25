package com.dreampath.controller.chatbot;

import com.dreampath.dto.chatbot.ChatRequestDto;
import com.dreampath.entity.User;
import com.dreampath.entity.chatbot.ChatbotMessage;
import com.dreampath.entity.chatbot.ChatbotSession;
import com.dreampath.repository.UserRepository;
import com.dreampath.repository.chatbot.ChatbotMessageRepository;
import com.dreampath.repository.chatbot.ChatbotSessionRepository;
import com.dreampath.service.rag.RagEmbeddingService;
import com.dreampath.service.rag.RagSearchService;
import com.dreampath.service.rag.RagAnswerService;
import lombok.RequiredArgsConstructor;
import org.json.JSONArray;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat-rag")
@RequiredArgsConstructor
public class ChatRagController {

    private final RagEmbeddingService embeddingService;
    private final RagSearchService searchService;
    private final RagAnswerService answerService;
    private final ChatbotSessionRepository sessionRepository;
    private final ChatbotMessageRepository messageRepository;
    private final UserRepository userRepository;

    @PostMapping("/message")
    public Map<String, Object> chat(@RequestBody ChatRequestDto dto) {

        // 1. User 조회 (비회원이면 null)
        User user = null;
        if (dto.getUserId() != null) {
            user = userRepository.findById(dto.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found with id: " + dto.getUserId()));
        }

        // 2. 세션 생성 또는 조회
        ChatbotSession session;
        if (dto.getSessionId() == null) {
            // 새 세션 생성
            ChatbotSession newSession = new ChatbotSession();
            newSession.setId(UUID.randomUUID());
            newSession.setUser(user);
            newSession.setGuestId(dto.getGuestId());
            newSession.setConversationTitle(dto.getConversationTitle());
            newSession.setCreatedAt(LocalDateTime.now());
            session = sessionRepository.save(newSession);
        } else {
            // 기존 세션 조회
            session = sessionRepository.findById(dto.getSessionId())
                    .orElseThrow(() -> new RuntimeException("Session not found with id: " + dto.getSessionId()));
        }

        // 3. 사용자 메시지 저장
        ChatbotMessage userMsg = new ChatbotMessage();
        userMsg.setSession(session);
        userMsg.setUser(user);
        userMsg.setGuestId(dto.getGuestId());
        userMsg.setRole("user");
        userMsg.setMessage(dto.getMessage());
        userMsg.setCreatedAt(LocalDateTime.now());
        messageRepository.save(userMsg);

        // 4. RAG 답변 생성
        float[] vector = embeddingService.embed(dto.getMessage());
        JSONArray matches = searchService.search(vector);
        String answer = answerService.generateAnswer(dto.getMessage(), matches);

        // 5. AI 답변 저장
        ChatbotMessage aiMsg = new ChatbotMessage();
        aiMsg.setSession(session);
        aiMsg.setUser(user);
        aiMsg.setGuestId(dto.getGuestId());
        aiMsg.setRole("assistant");
        aiMsg.setMessage(answer);
        aiMsg.setCreatedAt(LocalDateTime.now());
        messageRepository.save(aiMsg);

        // 6. 응답 반환
        return Map.of(
                "session", session.getId(),
                "response", answer
        );
    }

    @GetMapping("/history/{sessionId}")
    public Map<String, Object> getHistory(@PathVariable UUID sessionId) {
        List<ChatbotMessage> messages = messageRepository.findBySession_IdOrderByCreatedAtAsc(sessionId);

        List<Map<String, String>> history = messages.stream()
                .map(msg -> Map.of(
                        "role", msg.getRole(),
                        "text", msg.getMessage()
                ))
                .toList();

        return Map.of("history", history);
    }
}
