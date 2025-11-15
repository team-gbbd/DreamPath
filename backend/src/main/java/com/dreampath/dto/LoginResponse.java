package com.dreampath.dto;

import com.dreampath.enums.Role;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {
    private Long userId;
    private String username;
    private String name;
    private Role role;
}
