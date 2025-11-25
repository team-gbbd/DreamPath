package com.dreampath.domain.user.dto;

import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Getter
@Setter
public class EmailSendRequest {

    @NotBlank
    @Email
    private String email;
}
