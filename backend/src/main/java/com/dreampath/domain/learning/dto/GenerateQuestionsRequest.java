package com.dreampath.domain.learning.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GenerateQuestionsRequest {

    @NotNull
    @Min(1)
    private Integer count = 5;
}
