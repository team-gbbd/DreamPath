package com.dreampath.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TokenRequest {

    @NotBlank(message = "Room name is required")
    private String roomName;

    @NotBlank(message = "Participant name is required")
    private String participantName;
}
