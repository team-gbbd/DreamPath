package com.dreampath.domain.learning.entity;

import com.dreampath.global.enums.WeeklyStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "weekly_sessions")
public class WeeklySession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long weeklyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "path_id", nullable = false)
    private LearningPath learningPath;

    @Column(nullable = false)
    private Integer weekNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WeeklyStatus status = WeeklyStatus.LOCKED;

    @Column(columnDefinition = "TEXT")
    private String aiSummary;

    @Column(nullable = false)
    private Integer correctCount = 0;

    @Column(nullable = false)
    private Integer earnedScore = 0;  // 획득 점수

    @Column(nullable = false)
    private Integer totalScore = 0;   // 총 배점

    private LocalDateTime completedAt;  // 완료 시간

    private LocalDateTime unlockAt;     // 잠금 해제 예정 시간

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "weeklySession", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WeeklyQuestion> questions;
}
