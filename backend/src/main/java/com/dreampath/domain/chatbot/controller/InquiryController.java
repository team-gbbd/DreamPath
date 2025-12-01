package com.dreampath.domain.chatbot.controller;

import com.dreampath.domain.chatbot.entity.ChatbotSession;
import com.dreampath.domain.chatbot.entity.Inquiry;
import com.dreampath.domain.chatbot.repository.ChatbotSessionRepository;
import com.dreampath.domain.chatbot.repository.InquiryRepository;
import com.dreampath.domain.user.entity.User;
import com.dreampath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping(value = "/api/inquiry", produces = "application/json;charset=UTF-8")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryRepository inquiryRepository;
    private final UserRepository userRepository;
    private final ChatbotSessionRepository chatbotSessionRepository;

    /**
     * 문의 생성
     */
    @PostMapping(consumes = "application/json;charset=UTF-8")
    public Map<String, Object> createInquiry(@RequestBody Map<String, Object> request) {
        try {
            String name = (String) request.get("name");
            String email = (String) request.get("email");
            String content = (String) request.get("content");
            Long userId = request.get("userId") != null ? ((Number) request.get("userId")).longValue() : null;
            String sessionIdStr = (String) request.get("sessionId");

            System.out.println("📬 문의 접수 - userId: " + userId + ", sessionId: " + sessionIdStr);

            if (name == null || name.trim().isEmpty()) {
                return Map.of(
                    "success", false,
                    "message", "이름을 입력해주세요."
                );
            }

            if (email == null || email.trim().isEmpty()) {
                return Map.of(
                    "success", false,
                    "message", "이메일을 입력해주세요."
                );
            }

            if (content == null || content.trim().isEmpty()) {
                return Map.of(
                    "success", false,
                    "message", "문의 내용을 입력해주세요."
                );
            }

            Inquiry inquiry = new Inquiry();
            inquiry.setName(name.trim());
            inquiry.setEmail(email.trim());
            inquiry.setContent(content.trim());

            // 로그인한 사용자인 경우 User 설정
            if (userId != null) {
                userRepository.findById(userId).ifPresent(user -> {
                    inquiry.setUser(user);
                    System.out.println("✅ User 연결 완료: " + user.getName());
                });
            }

            // 챗봇 세션이 있는 경우 Session 설정
            if (sessionIdStr != null && !sessionIdStr.trim().isEmpty()) {
                try {
                    UUID sessionId = UUID.fromString(sessionIdStr);
                    chatbotSessionRepository.findById(sessionId).ifPresent(session -> {
                        inquiry.setSession(session);
                        System.out.println("✅ Session 연결 완료: " + sessionId);
                    });
                } catch (IllegalArgumentException e) {
                    System.err.println("❌ Invalid session ID format: " + sessionIdStr);
                }
            } else {
                System.out.println("ℹ️  Session ID 없음 (문의만 하는 경우)");
            }

            Inquiry saved = inquiryRepository.save(inquiry);
            System.out.println("✅ 문의 저장 완료 - ID: " + saved.getId());

            return Map.of(
                "success", true,
                "message", "문의가 성공적으로 접수되었습니다.",
                "data", saved
            );
        } catch (Exception e) {
            return Map.of(
                "success", false,
                "message", "문의 접수 중 오류가 발생했습니다: " + e.getMessage()
            );
        }
    }

    /**
     * 모든 문의 조회 (관리자용)
     */
    @GetMapping("/all")
    public List<Inquiry> getAllInquiries() {
        return inquiryRepository.findAllByOrderByCreatedAtDesc();
    }
}
