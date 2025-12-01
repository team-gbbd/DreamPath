package com.dreampath.domain.career.entity;

/**
 * 대화 진행 단계
 * 
 * 정체성 확립을 위한 4단계 대화 프로세스
 */
public enum ConversationStage {
    
    /**
     * 1단계: 현재 상태 파악
     * - 현재 감정 상태
     * - 진로에 대한 느낌
     * - 현재 고민거리
     */
    PRESENT("현재", "지금의 나", 0),
    
    /**
     * 2단계: 과거 경험 탐색
     * - 의미있었던 경험
     * - 몰입했던 활동
     * - 즐거웠던 순간
     */
    PAST("과거", "경험 속의 나", 1),
    
    /**
     * 3단계: 가치관 탐색
     * - 중요하게 여기는 것
     * - 삶의 의미
     * - 이루고 싶은 것
     */
    VALUES("가치관", "내가 추구하는 것", 2),
    
    /**
     * 4단계: 미래 상상
     * - 되고 싶은 사람
     * - 10년 후 모습
     * - 이루고 싶은 삶
     */
    FUTURE("미래", "되고 싶은 나", 3),
    
    /**
     * 5단계: 정체성 확립 및 진로 연결
     * - 정체성 통합
     * - 구체적 진로 탐색
     * - 실행 계획
     */
    IDENTITY("정체성", "진짜 나", 4);
    
    private final String displayName;
    private final String description;
    private final int order;
    
    ConversationStage(String displayName, String description, int order) {
        this.displayName = displayName;
        this.description = description;
        this.order = order;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    public String getDescription() {
        return description;
    }
    
    public int getOrder() {
        return order;
    }
    
    /**
     * 다음 단계로 진행
     */
    public ConversationStage next() {
        return switch (this) {
            case PRESENT -> PAST;
            case PAST -> VALUES;
            case VALUES -> FUTURE;
            case FUTURE -> IDENTITY;
            case IDENTITY -> IDENTITY; // 마지막 단계 유지
        };
    }
    
    /**
     * 진행률 계산 (0-100%)
     */
    public int getProgress() {
        return (order * 100) / 4;
    }
    
    /**
     * 최소 메시지 수 (단계 전환 기준)
     */
    public int getMinMessages() {
        return switch (this) {
            case PRESENT -> 3;   // 3개 메시지 후 과거로
            case PAST -> 5;      // 5개 메시지 후 가치관으로
            case VALUES -> 5;    // 5개 메시지 후 미래로
            case FUTURE -> 5;    // 5개 메시지 후 정체성으로
            case IDENTITY -> 0;  // 계속 진행
        };
    }
}

