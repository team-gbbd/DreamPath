package com.dreampath.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class ChatRequestDto {

    private UUID sessionId;
    private UUID userId;
    private String message;
    private String conversationTitle;

}
