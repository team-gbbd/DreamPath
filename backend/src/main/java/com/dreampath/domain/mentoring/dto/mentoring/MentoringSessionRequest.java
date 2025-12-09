package com.dreampath.domain.mentoring.dto.mentoring;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class MentoringSessionRequest {

    @NotNull(message = "멘토 ID는 필수입니다")
    private Long mentorId;

    @NotBlank(message = "제목은 필수입니다")
    private String title;

    private String description;

    @NotNull(message = "세션 날짜는 필수입니다 (정각만 가능)")
    private LocalDateTime sessionDate;
}
