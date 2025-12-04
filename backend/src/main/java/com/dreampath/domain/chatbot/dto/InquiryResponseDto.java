package com.dreampath.domain.chatbot.dto;

import com.dreampath.domain.chatbot.entity.Inquiry;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InquiryResponseDto {

    private Long id;
    private UserInfo user;
    private String name;
    private String email;
    private String content;
    private Boolean answered;
    private LocalDateTime answeredAt;
    private String replyContent;
    private LocalDateTime createdAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long userId;
        private String name;
        private String email;
    }

    public static InquiryResponseDto fromEntity(Inquiry inquiry) {
        InquiryResponseDto dto = new InquiryResponseDto();
        dto.setId(inquiry.getId());
        dto.setName(inquiry.getName());
        dto.setEmail(inquiry.getEmail());
        dto.setContent(inquiry.getContent());
        dto.setAnswered(inquiry.getAnswered());
        dto.setAnsweredAt(inquiry.getAnsweredAt());
        dto.setReplyContent(inquiry.getReplyContent());
        dto.setCreatedAt(inquiry.getCreatedAt());

        // User 정보가 있으면 설정
        if (inquiry.getUser() != null) {
            UserInfo userInfo = new UserInfo();
            userInfo.setUserId(inquiry.getUser().getUserId());
            userInfo.setName(inquiry.getUser().getName());
            userInfo.setEmail(inquiry.getUser().getEmail());
            dto.setUser(userInfo);
        }

        return dto;
    }
}
