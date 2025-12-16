package com.dreampath.global.config;

import com.dreampath.global.jwt.JwtAuthenticationFilter;
import com.dreampath.global.oauth.CustomOAuth2UserService;
import com.dreampath.global.oauth.OAuth2AuthenticationFailureHandler;
import com.dreampath.global.oauth.OAuth2AuthenticationSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

@Configuration
@ConditionalOnWebApplication
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2AuthenticationSuccessHandler successHandler;
    private final OAuth2AuthenticationFailureHandler failureHandler;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // === 공개 엔드포인트 ===
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/oauth2/**", "/login/**").permitAll()
                        .requestMatchers("/api/health", "/actuator/health").permitAll()
                        // 직업/전공 정보 (참고용 데이터)
                        .requestMatchers("/api/job/**", "/api/major/**").permitAll()
                        // 추천 API (임시 공개 - 디버깅용)
                        .requestMatchers("/api/recommendation/**").permitAll()
                        // 멘토/세션 목록 조회 (비회원도 열람 가능)
                        .requestMatchers("/api/mentors/approved").permitAll()
                        .requestMatchers("/api/mentors/{mentorId}").permitAll()
                        .requestMatchers("/api/mentoring-sessions/available").permitAll()
                        .requestMatchers("/api/mentoring-sessions/{sessionId}").permitAll()
                        // 문의 생성은 비회원도 가능, 관리자 기능은 인증 필요
                        .requestMatchers("/api/inquiry").permitAll()
                        .requestMatchers("/api/inquiry/all", "/api/inquiry/reply").authenticated()
                        // === 나머지 모든 API는 인증 필요 ===
                        .anyRequest().authenticated()
                )
                // REST API 인증 실패 시 401 반환 (로그인 페이지 리다이렉트 방지)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                )
                .oauth2Login(oauth -> oauth
                        .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                        .successHandler(successHandler)
                        .failureHandler(failureHandler)
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
