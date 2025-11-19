package com.dreampath.controller;

import com.dreampath.dto.ChatRequestDto;
import com.dreampath.service.ChatbotService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/message")
    public Object sendMessage(@RequestBody ChatRequestDto dto) {

        UUID sessionId = chatbotService.handleMessage(dto);
        String answer = chatbotService.generateAnswer(sessionId, dto.getMessage());
        chatbotService.saveAssistantMessage(sessionId, dto.getUserId(), answer);

        return new Object() {
            public UUID session = sessionId;
            public String response = answer;
        };
    }
}
