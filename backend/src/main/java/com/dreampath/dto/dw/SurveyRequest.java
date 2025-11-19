package com.dreampath.dto.dw;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 설문조사 요청 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SurveyRequest {
    private String sessionId;
    private String userId;
    
    /**
     * 이름 (선택)
     */
    private String name;
    
    /**
     * 나이
     */
    private Integer age;
    
    /**
     * 관심 분야 (여러 개 선택 가능)
     */
    private List<String> interests;
    
    /**
     * 좋아하는 과목 (여러 개 선택 가능)
     */
    private List<String> favoriteSubjects;
    
    /**
     * 어려워하는/싫어하는 과목 (여러 개 선택 가능)
     */
    private List<String> difficultSubjects;
    
    /**
     * 장래 희망이 있는지 여부 (있음/없음/모호함)
     */
    private String hasDreamCareer;
    
    /**
     * 진로 결정에 대한 압박감 정도 (높음/보통/낮음)
     */
    private String careerPressure;
    
    /**
     * 현재 고민 (선택)
     */
    private String concern;
}

