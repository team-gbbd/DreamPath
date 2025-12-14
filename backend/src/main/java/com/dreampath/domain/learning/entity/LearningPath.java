package com.dreampath.domain.learning.entity;

import com.dreampath.domain.user.entity.User;
import com.dreampath.domain.career.entity.CareerAnalysis;
import com.dreampath.global.enums.PathStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "learning_paths")
public class LearningPath {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long pathId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id")
    private CareerAnalysis careerAnalysis;

    @Column(nullable = false, length = 100)
    private String domain;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PathStatus status = PathStatus.ACTIVE;

    @Column(nullable = false)
    private Integer totalQuestions = 0;

    @Column(nullable = false)
    private Integer correctCount = 0;

    @Column(nullable = false)
    private Integer earnedScore = 0;  // 총 획득 점수

    @Column(nullable = false)
    private Integer totalMaxScore = 0;  // 총 배점

    // 득점률 (earnedScore / totalMaxScore * 100)
    @Transient
    public Float getScoreRate() {
        if (totalMaxScore == null || totalMaxScore == 0) return 0.0f;
        return (float) earnedScore / totalMaxScore * 100;
    }

    // 기존 correctRate는 호환성 유지 (deprecated)
    @Column(insertable = false, updatable = false)
    private Float correctRate;

    // JSONB 타입 (PostgreSQL)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String weaknessTags;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "learningPath", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WeeklySession> weeklySessions;
}
