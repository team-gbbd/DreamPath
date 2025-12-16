package com.dreampath.domain.user.service;

import com.dreampath.domain.user.dto.LoginRequest;
import com.dreampath.domain.user.dto.LoginResponse;
import com.dreampath.domain.user.dto.RegisterRequest;
import com.dreampath.domain.user.entity.User;
import com.dreampath.global.enums.Role;
import com.dreampath.global.jwt.JwtTokenProvider;
import com.dreampath.global.oauth.OAuthAttributes;
import com.dreampath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService emailVerificationService;
    private final JwtTokenProvider jwtTokenProvider;

    // =======================
    // 비밀번호 정책 검증
    // =======================
    private void validatePassword(String password, String username) {

        // 길이 체크
        if (password.length() < 8 || password.length() > 20) {
            throw new IllegalArgumentException("비밀번호는 8~20자여야 합니다.");
        }

        // 영문/숫자/특수문자 중 2종 이상
        int count = 0;
        if (password.matches(".*[a-zA-Z].*"))
            count++;
        if (password.matches(".*[0-9].*"))
            count++;
        if (password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{}|;:',.<>/?].*"))
            count++;

        if (count < 2) {
            throw new IllegalArgumentException("영문/숫자/특수문자 중 2가지 이상 포함해야 합니다.");
        }

        // 연속/반복 검사
        String lower = password.toLowerCase();

        for (int i = 0; i < lower.length() - 2; i++) {
            char c1 = lower.charAt(i);
            char c2 = lower.charAt(i + 1);
            char c3 = lower.charAt(i + 2);

            // abc / 123
            if ((c2 == c1 + 1) && (c3 == c2 + 1)) {
                throw new IllegalArgumentException("연속된 문자 3개 이상 사용 불가.");
            }

            // aaa / !!! / 111
            if (c1 == c2 && c2 == c3) {
                throw new IllegalArgumentException("같은 문자 3번 반복 불가.");
            }
        }

        // username 포함 금지
        if (username != null && password.toLowerCase().contains(username.toLowerCase())) {
            throw new IllegalArgumentException("비밀번호에 아이디를 포함할 수 없습니다.");
        }
    }

    // =======================
    // 회원가입
    // =======================
    public void register(RegisterRequest req) {

        if (userRepository.existsByUsername(req.getUsername())) {
            throw new RuntimeException("이미 존재하는 아이디입니다.");
        }

        if (userRepository.existsByPhone(req.getPhone())) {
            throw new RuntimeException("이미 사용중인 휴대폰 번호입니다.");
        }

        if (req.getEmail() == null || req.getEmail().isBlank()) {
            throw new RuntimeException("이메일은 필수값입니다.");
        }

        if (userRepository.existsByEmail(req.getEmail())) {
            throw new RuntimeException("이미 사용중인 이메일입니다.");
        }

        if (!emailVerificationService.isVerifiedEmail(req.getEmail())) {
            throw new RuntimeException("이메일 인증을 완료해주세요.");
        }

        // 비밀번호 검증
        validatePassword(req.getPassword(), req.getUsername());

        User user = new User();
        user.setUsername(req.getUsername());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setName(req.getName());
        user.setPhone(req.getPhone());
        user.setEmail(req.getEmail());
        user.setBirth(req.getBirth());
        user.setRole(Role.USER);

        userRepository.save(user);
        emailVerificationService.consumeToken(req.getEmail());
    }

    // 아이디 중복확인
    public boolean checkUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public LoginResponse login(LoginRequest req) {
        User user = userRepository.findByUsername(req.getUsername())
                .orElseThrow(() -> new RuntimeException("존재하지 않는 아이디입니다."));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new RuntimeException("비밀번호가 일치하지 않습니다.");
        }

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new RuntimeException("비활성화된 계정입니다. 관리자에게 문의해주세요.");
        }

        return toLoginResponse(user);
    }

    public LoginResponse loginWithOAuth(OAuthAttributes attributes) {
        String provider = normalizeProvider(attributes.provider());
        String providerId = attributes.providerId();

        User user = null;

        if (provider != null && providerId != null) {
            user = userRepository.findByProviderAndProviderId(provider, providerId).orElse(null);
        }

        if (user == null && attributes.email() != null && !attributes.email().isBlank()) {
            boolean enforceByEmail = provider != null;
            user = userRepository.findByEmail(attributes.email()).orElse(null);
            if (user != null) {
                String existingProvider = normalizeProvider(user.getProvider());
                if (enforceByEmail && (existingProvider == null || !existingProvider.equals(provider))) {
                    throw new RuntimeException("해당 이메일로 가입된 계정이 이미 있습니다. 기존 로그인 방식을 사용해주세요.");
                }
                if (user.getProvider() == null || user.getProviderId() == null) {
                    user.setProvider(provider);
                    user.setProviderId(providerId);
                    user = userRepository.save(user);
                }
            }
        }

        if (user == null) {
            user = createUserFromOAuth(attributes);
        }

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new RuntimeException("비활성화된 계정입니다. 관리자에게 문의해주세요.");
        }

        return toLoginResponse(user);
    }

    private User createUserFromOAuth(OAuthAttributes attributes) {
        String provider = normalizeProvider(attributes.provider());
        User user = new User();
        user.setUsername(generateUniqueUsername(provider, attributes.providerId()));
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        String displayName = (attributes.name() != null && !attributes.name().isBlank())
                ? attributes.name()
                : (attributes.email() != null ? attributes.email() : "사용자");
        user.setName(displayName);
        user.setPhone(null);
        user.setEmail(attributes.email());
        user.setBirth(null);
        user.setRole(Role.USER);
        user.setProvider(provider);
        user.setProviderId(attributes.providerId());
        return userRepository.save(user);
    }

    private String generateUniqueUsername(String provider, String providerId) {
        String base = (provider != null ? provider.toLowerCase() : "social") + "_" + (providerId != null ? providerId : UUID.randomUUID());
        String sanitized = base.replaceAll("[^a-z0-9_]", "_");
        String candidate = sanitized;
        int suffix = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = sanitized + "_" + suffix++;
        }
        return candidate;
    }

    private LoginResponse toLoginResponse(User user) {
        // JWT 토큰 생성
        String token = jwtTokenProvider.createToken(
                user.getUserId(),
                user.getUsername(),
                user.getRole().name()
        );

        return LoginResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .birth(user.getBirth())
                .createdAt(user.getCreatedAt())
                .role(user.getRole())
                .accessToken(token)
                .build();
    }

    private String normalizeProvider(String provider) {
        return provider == null ? null : provider.toLowerCase();
    }
}
