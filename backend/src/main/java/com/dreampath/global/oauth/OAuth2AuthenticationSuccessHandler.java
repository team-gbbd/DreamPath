package com.dreampath.global.oauth;

import com.dreampath.domain.user.dto.LoginResponse;
import com.dreampath.domain.user.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final AuthService authService;
    private final ObjectMapper objectMapper;

    @Value("${app.frontend-url:http://localhost:3002}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        if (!(authentication.getPrincipal() instanceof CustomOAuth2User oAuth2User)) {
            redirectWithError(response, "알 수 없는 사용자 정보입니다.");
            return;
        }

        try {
            OAuthAttributes attributes = oAuth2User.getOAuthAttributes();
            LoginResponse loginResponse = authService.loginWithOAuth(attributes);
            String payload = objectMapper.writeValueAsString(loginResponse);
            String encodedUser = Base64.getUrlEncoder().encodeToString(payload.getBytes(StandardCharsets.UTF_8));

            String targetUrl = UriComponentsBuilder
                    .fromUriString(frontendUrl + "/login")
                    .queryParam("social", "success")
                    .queryParam("user", encodedUser)
                    .build()
                    .encode()
                    .toUriString();

            response.sendRedirect(targetUrl);
        } catch (RuntimeException ex) {
            redirectWithError(response, ex.getMessage());
        }
    }

    private void redirectWithError(HttpServletResponse response, String message) throws IOException {
        String targetUrl = UriComponentsBuilder
                .fromUriString(frontendUrl + "/login")
                .queryParam("social", "error")
                .queryParam("message", message)
                .build()
                .encode()
                .toUriString();
        response.sendRedirect(targetUrl);
    }
}
