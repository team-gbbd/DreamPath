package com.dreampath.domain.recommendation.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "major_recommendations", indexes = {
        @Index(name = "idx_major_user_id", columnList = "userId"),
        @Index(name = "idx_major_created_at", columnList = "createdAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MajorRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(length = 100)
    private String majorCode;

    @Column(nullable = false)
    private String majorName;

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
