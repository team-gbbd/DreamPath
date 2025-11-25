package com.dreampath.domain.user.service;

import com.dreampath.domain.user.entity.EmailVerificationToken;
import com.dreampath.domain.user.repository.EmailVerificationTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final int TOKEN_LENGTH = 6;
    private static final long EXPIRES_MINUTES = 10L;

    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:no-reply@dreampath.com}")
    private String senderEmail;

    public void sendVerificationCode(String email) {
        EmailVerificationToken token = emailVerificationTokenRepository
                .findByEmail(email)
                .orElseGet(() -> {
                    EmailVerificationToken entity = new EmailVerificationToken();
                    entity.setEmail(email);
                    return entity;
                });

        String code = generateToken();
        token.setToken(code);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(EXPIRES_MINUTES));
        token.setVerified(false);

        emailVerificationTokenRepository.save(token);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setFrom(senderEmail);
        message.setSubject("[DreamPath] 이메일 인증 코드");
        message.setText("""
                안녕하세요, DreamPath 입니다.

                이메일 인증 코드: %s

                본 코드는 %d분 동안만 유효합니다.
                """.formatted(code, EXPIRES_MINUTES));

        mailSender.send(message);
    }

    public void verifyCode(String email, String code) {
        EmailVerificationToken token = emailVerificationTokenRepository
                .findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("해당 이메일로 발송된 인증 코드를 찾을 수 없습니다."));

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("인증 코드가 만료되었습니다. 다시 요청해주세요.");
        }

        if (!token.getToken().equals(code)) {
            throw new IllegalArgumentException("인증 코드가 일치하지 않습니다.");
        }

        token.setVerified(true);
        emailVerificationTokenRepository.save(token);
    }

    public boolean isVerifiedEmail(String email) {
        return emailVerificationTokenRepository.findByEmail(email)
                .filter(EmailVerificationToken::isVerified)
                .filter(token -> token.getExpiresAt().isAfter(LocalDateTime.now()))
                .isPresent();
    }

    public void consumeToken(String email) {
        emailVerificationTokenRepository.findByEmail(email).ifPresent(emailVerificationTokenRepository::delete);
    }

    private String generateToken() {
        Random random = new Random();
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < TOKEN_LENGTH; i++) {
            builder.append(random.nextInt(10));
        }
        return builder.toString();
    }
}
