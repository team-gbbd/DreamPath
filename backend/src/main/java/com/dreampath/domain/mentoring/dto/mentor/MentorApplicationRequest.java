package com.dreampath.domain.mentoring.dto.mentor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * 멘토 신청 요청 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MentorApplicationRequest {

    @NotNull(message = "사용자 ID는 필수입니다")
    private Long userId;

    @NotBlank(message = "자기소개는 필수입니다")
    private String bio;

    @NotBlank(message = "경력은 필수입니다")
    private String career;

    private Map<String, Object> availableTime; // 가능 시간 (선택)
}
