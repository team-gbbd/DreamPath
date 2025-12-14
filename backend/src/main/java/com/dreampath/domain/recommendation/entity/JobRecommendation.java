package com.dreampath.domain.recommendation.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "job_recommendations", indexes = {
        @Index(name = "idx_job_user_id", columnList = "userId"),
        @Index(name = "idx_job_created_at", columnList = "createdAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(length = 100)
    private String jobCode;

    @Column(nullable = false)
    private String jobName;

    @Column(nullable = false)
    private Double matchScore;

    private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
