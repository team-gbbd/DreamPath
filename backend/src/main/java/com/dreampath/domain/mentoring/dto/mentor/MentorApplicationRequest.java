package com.dreampath.domain.mentoring.dto.mentor;

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

    private Long userId; // 신청 시에만 필수

    private String company;

    private String job;

    private String experience;

    private String bio;

    private String career;

    private Map<String, Object> availableTime; // 가능 시간 (선택)
}
