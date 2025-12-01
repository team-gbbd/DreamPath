package com.dreampath.domain.user.dto;

import com.dreampath.global.enums.Role;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {
    private Long userId;
    private String username;
    private String name;
    private String email;
    private Role role;
}
