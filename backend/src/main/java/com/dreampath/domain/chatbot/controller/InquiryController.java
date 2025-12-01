package com.dreampath.domain.chatbot.controller;

import com.dreampath.domain.chatbot.dto.InquiryReplyRequestDto;
import com.dreampath.domain.chatbot.dto.InquiryResponseDto;
import com.dreampath.domain.chatbot.entity.ChatbotSession;
import com.dreampath.domain.chatbot.entity.Inquiry;
import com.dreampath.domain.chatbot.repository.ChatbotSessionRepository;
import com.dreampath.domain.chatbot.repository.InquiryRepository;
import com.dreampath.domain.chatbot.service.EmailService;
import com.dreampath.domain.user.entity.User;
import com.dreampath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping(value = "/api/inquiry", produces = "application/json;charset=UTF-8")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryRepository inquiryRepository;
    private final UserRepository userRepository;
    private final ChatbotSessionRepository chatbotSessionRepository;
    private final EmailService emailService;

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
    public List<InquiryResponseDto> getAllInquiries() {
        List<Inquiry> inquiries = inquiryRepository.findAllByOrderByCreatedAtDesc();
        return inquiries.stream()
                .map(InquiryResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 문의 답변 이메일 전송
     */
    @PostMapping("/reply")
    public Map<String, Object> sendReply(@RequestBody InquiryReplyRequestDto request) {
        try {
            // 문의가 존재하는지 확인 및 답변 상태 업데이트
            Inquiry inquiry = null;
            if (request.getInquiryId() != null) {
                inquiry = inquiryRepository.findById(request.getInquiryId())
                    .orElseThrow(() -> new RuntimeException("문의를 찾을 수 없습니다."));
            }

            // 이메일 전송
            emailService.sendInquiryReply(
                request.getRecipientEmail(),
                request.getRecipientName(),
                request.getInquiryContent(),
                request.getReplyContent()
            );

            // 답변 완료 상태로 업데이트 및 답변 내용 저장
            if (inquiry != null) {
                inquiry.setAnswered(true);
                inquiry.setAnsweredAt(java.time.LocalDateTime.now());
                inquiry.setReplyContent(request.getReplyContent());
                inquiryRepository.save(inquiry);
                System.out.println("✅ 문의 답변 완료 처리: ID " + inquiry.getId());
            }

            return Map.of(
                "success", true,
                "message", "답변이 성공적으로 전송되었습니다."
            );
        } catch (Exception e) {
            System.err.println("❌ 답변 전송 실패: " + e.getMessage());
            return Map.of(
                "success", false,
                "message", "답변 전송에 실패했습니다: " + e.getMessage()
            );
        }
    }
}
