package com.dreampath.controller.chatbot;

import com.dreampath.dto.chatbot.ChatRequestDto;
import com.dreampath.service.chatbot.ChatbotService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/message")
    public Map<String, Object> chat(@RequestBody ChatRequestDto dto) {

        // 1. 사용자 메시지 저장 + 세션 생성
        UUID sessionId = chatbotService.handleMessage(dto);

        // 2. AI 답변 생성
        String aiResponse = chatbotService.generateAnswer(sessionId, dto.getMessage());

        // 3. AI 메시지 저장
        chatbotService.saveAssistantMessage(sessionId, dto.getUserId(), aiResponse);

        // 4. 프론트에 반환
        return Map.of(
                "session", sessionId,
                "response", aiResponse
        );
    }
}
