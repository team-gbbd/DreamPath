package com.dreampath.entity.dw;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "career_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CareerSession {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String sessionId;
    
    @Column(name = "user_id")
    private String userId;
    
    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ChatMessage> messages = new ArrayList<>();
    
    @OneToOne(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    private CareerAnalysis analysis;
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SessionStatus status = SessionStatus.ACTIVE;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "conversation_stage")
    @Builder.Default
    private ConversationStage currentStage = ConversationStage.PRESENT;
    
    @Column(name = "stage_message_count")
    @Builder.Default
    private Integer stageMessageCount = 0;
    
    /**
     * 설문조사 완료 여부
     */
    @Column(name = "survey_completed")
    @Builder.Default
    private Boolean surveyCompleted = false;
    
    /**
     * 설문조사 응답 데이터 (JSON 형식)
     * 예: {"name": "홍길동", "age": 17, "interests": ["프로그래밍", "디자인"], 
     *      "favoriteSubjects": ["수학", "과학"], "difficultSubjects": ["영어"],
     *      "hasDreamCareer": "모호함", "careerPressure": "높음", "concern": "진로가 불확실함"}
     */
    @Column(name = "survey_data", columnDefinition = "TEXT")
    private String surveyData;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public enum SessionStatus {
        ACTIVE, COMPLETED, ARCHIVED
    }
}

