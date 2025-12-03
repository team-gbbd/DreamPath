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

    @NotNull(message = "세션 날짜는 필수입니다")
    private LocalDateTime sessionDate;

    @Min(value = 30, message = "세션 시간은 최소 30분 이상이어야 합니다")
    private Integer durationMinutes = 60;

    @Min(value = 0, message = "가격은 0 이상이어야 합니다")
    private Integer price = 0;
}
