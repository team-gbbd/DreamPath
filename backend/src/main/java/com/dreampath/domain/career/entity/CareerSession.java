package com.dreampath.domain.career.entity;

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
     * 정체성 분석 상태 캐시 (JSON 형식)
     * 비동기 분석 결과를 저장하여 GET 요청 시 재사용
     */
    @Column(name = "identity_status_json", columnDefinition = "TEXT")
    private String identityStatusJson;
    
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

