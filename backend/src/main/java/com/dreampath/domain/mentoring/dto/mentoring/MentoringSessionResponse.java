package com.dreampath.domain.mentoring.dto.mentoring;

import com.dreampath.domain.mentoring.entity.MentoringSession;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class MentoringSessionResponse {

    private Long sessionId;
    private Long mentorId;
    private String mentorName;
    private String mentorUsername;
    private String title;
    private String description;
    private LocalDateTime sessionDate;
    private Integer durationMinutes;
    private Integer currentParticipants;
    private Integer availableSlots;
    private Boolean isActive;
    private Boolean isFull;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MentoringSessionResponse from(MentoringSession session) {
        return MentoringSessionResponse.builder()
                .sessionId(session.getSessionId())
                .mentorId(session.getMentor().getMentorId())
                .mentorName(session.getMentor().getUser().getName())
                .mentorUsername(session.getMentor().getUser().getUsername())
                .title(session.getTitle())
                .description(session.getDescription())
                .sessionDate(session.getSessionDate())
                .durationMinutes(session.getDurationMinutes())
                .currentParticipants(session.getCurrentParticipants())
                .availableSlots(session.getAvailableSlots())
                .isActive(session.getIsActive())
                .isFull(session.isFull())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .build();
    }
}
