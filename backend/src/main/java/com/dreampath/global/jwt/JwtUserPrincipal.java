package com.dreampath.global.jwt;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * JWT 인증된 사용자 정보
 */
@Getter
@AllArgsConstructor
public class JwtUserPrincipal {
    private Long userId;
    private String username;
    private String role;
}
