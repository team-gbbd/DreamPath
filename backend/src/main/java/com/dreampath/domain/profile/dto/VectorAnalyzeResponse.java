package com.dreampath.domain.profile.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class VectorAnalyzeResponse {
    private Long userId;
    private String vectorDbId;
    private List<Float> vector;
    private Object bigfive;
    private Object mbti;
    private Integer dimension;
}
