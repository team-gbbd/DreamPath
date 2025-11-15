package com.dreampath.controller;

import com.dreampath.dto.EmailSendRequest;
import com.dreampath.dto.EmailVerifyRequest;
import com.dreampath.dto.LoginRequest;
import com.dreampath.dto.LoginResponse;
import com.dreampath.dto.RegisterRequest;
import com.dreampath.service.AuthService;
import com.dreampath.service.EmailVerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        authService.register(req);
        return ResponseEntity.ok("회원가입 완료");
    }

    @PostMapping("/email/send")
    public ResponseEntity<?> sendVerificationEmail(@Valid @RequestBody EmailSendRequest req) {
        emailVerificationService.sendVerificationCode(req.getEmail());
        return ResponseEntity.ok("인증 코드가 발송되었습니다.");
    }

    @PostMapping("/email/verify")
    public ResponseEntity<?> verifyEmail(@Valid @RequestBody EmailVerifyRequest req) {
        emailVerificationService.verifyCode(req.getEmail(), req.getCode());
        return ResponseEntity.ok("이메일 인증이 완료되었습니다.");
    }

    @GetMapping("/check-username")
    public ResponseEntity<Boolean> checkUsername(@RequestParam String username) {
        return ResponseEntity.ok(authService.checkUsername(username));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }
}
