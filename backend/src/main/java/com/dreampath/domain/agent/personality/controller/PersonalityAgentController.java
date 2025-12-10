package com.dreampath.domain.agent.personality.controller;

import com.dreampath.domain.agent.personality.dto.PersonalityAgentRequest;
import com.dreampath.domain.agent.personality.dto.PersonalityAgentResponse;
import com.dreampath.domain.agent.personality.service.PersonalityAgentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/agent/personality")
@RequiredArgsConstructor
public class PersonalityAgentController {

    private final PersonalityAgentService personalityAgentService;

    @PostMapping
    public ResponseEntity<PersonalityAgentResponse> runPersonalityAgent(
            @RequestBody PersonalityAgentRequest request
    ) {
        log.info("Personality Agent 요청 - sessionId={}", request.getSessionId());
        try {
            PersonalityAgentResponse response = personalityAgentService.run(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            log.warn("Personality Agent 요청 검증 실패: {}", ex.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception ex) {
            log.error("Personality Agent 실행 실패", ex);
            return ResponseEntity.internalServerError().build();
        }
    }
}
