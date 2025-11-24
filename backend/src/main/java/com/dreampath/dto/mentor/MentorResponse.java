package com.dreampath.dto.mentor;

import com.dreampath.entity.Mentor;
import com.dreampath.enums.MentorStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 멘토 응답 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MentorResponse {

    private Long mentorId;
    private Long userId;
    private String username;
    private String name;
    private String bio;
    private String career;
    private Map<String, Object> availableTime;
    private MentorStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MentorResponse from(Mentor mentor) {
        return MentorResponse.builder()
                .mentorId(mentor.getMentorId())
                .userId(mentor.getUser().getUserId())
                .username(mentor.getUser().getUsername())
                .name(mentor.getUser().getName())
                .bio(mentor.getBio())
                .career(mentor.getCareer())
                .availableTime(mentor.getAvailableTime())
                .status(mentor.getStatus())
                .createdAt(mentor.getCreatedAt())
                .updatedAt(mentor.getUpdatedAt())
                .build();
    }
}
