package com.dreampath.domain.user.dto;

import com.dreampath.global.enums.Role;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class LoginResponse {
    private Long userId;
    private String username;
    private String name;
    private String email;
    private String phone;
    private LocalDate birth;
    private LocalDateTime createdAt;
    private Role role;
    private String accessToken;  // JWT 토큰
}
