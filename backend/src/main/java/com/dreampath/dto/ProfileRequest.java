package com.dreampath.dto;
import lombok.Getter;
import lombok.Setter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Getter @Setter
public class ProfileRequest {
    @NotNull(message = "userId는 필수입니다.")
    private Long userId;

    @NotBlank(message = "성격 특성은 필수 입력입니다.")
    private String personalityTraits;

    @NotBlank(message = "가치관은 필수 입력입니다.")
    private String values;

    @NotBlank(message = "관심 분야는 필수 입력입니다.")
    private String interests;

    @NotBlank(message = "감정 패턴은 필수 입력입니다.")
    private String emotions;

    private Double confidenceScore;
}
