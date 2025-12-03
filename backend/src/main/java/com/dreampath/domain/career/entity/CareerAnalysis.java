package com.dreampath.domain.career.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "career_analyses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CareerAnalysis {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private CareerSession session;
    
    // 감정 분석
    @Column(columnDefinition = "TEXT")
    private String emotionAnalysis;
    
    @Column
    private Integer emotionScore; // 1-100
    
    // 성향 분석
    @Column(columnDefinition = "TEXT")
    private String personalityAnalysis;
    
    @Column
    private String personalityType; // MBTI 유형 등
    
    // 흥미 분석
    @Column(columnDefinition = "TEXT")
    private String interestAnalysis;
    
    @Column(columnDefinition = "TEXT")
    private String interestAreas; // JSON 형식의 흥미 분야
    
    // 종합 분석
    @Column(columnDefinition = "TEXT")
    private String comprehensiveAnalysis;
    
    // 추천 진로
    @Column(columnDefinition = "TEXT")
    private String recommendedCareers; // JSON 형식의 추천 진로
    
    @Column(nullable = false)
    private LocalDateTime analyzedAt;
    
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        analyzedAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

