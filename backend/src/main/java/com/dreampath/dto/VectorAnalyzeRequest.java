package com.dreampath.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VectorAnalyzeRequest {
    private Long userId;
    private String document;
}
