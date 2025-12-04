package com.dreampath.domain.chatbot.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    /**
     * 문의 답변 이메일 전송
     */
    public void sendInquiryReply(String recipientEmail, String recipientName, String inquiryContent, String replyContent) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(recipientEmail);
            message.setSubject("[DreamPath] 문의 답변 - " + recipientName + "님");
            message.setText(replyContent);

            mailSender.send(message);
            log.info("✉️ 이메일 전송 성공: {}", recipientEmail);
        } catch (Exception e) {
            log.error("❌ 이메일 전송 실패: {}", recipientEmail, e);
            throw new RuntimeException("이메일 전송에 실패했습니다: " + e.getMessage());
        }
    }
}
