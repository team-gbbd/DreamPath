package com.dreampath.domain.chatbot.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InquiryReplyRequestDto {
    private Long inquiryId;
    private String recipientEmail;
    private String recipientName;
    private String replyContent;
    private String inquiryContent;
}
