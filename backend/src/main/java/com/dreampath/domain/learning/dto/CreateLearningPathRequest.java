package com.dreampath.domain.learning.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateLearningPathRequest {

    @NotNull
    private Long userId;

    private Long analysisId;

    @NotBlank
    private String domain;
}
