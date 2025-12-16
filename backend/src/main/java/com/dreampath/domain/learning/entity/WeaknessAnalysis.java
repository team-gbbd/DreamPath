package com.dreampath.domain.learning.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "weakness_analyses")
public class WeaknessAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learning_path_id", nullable = false, unique = true)
    private LearningPath learningPath;

    // 약점 태그 JSON (tag, count, severity, description)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String weaknessTags;

    // 레이더 차트 데이터 JSON (category, score, fullMark)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String radarData;

    // 학습 권장사항 JSON (문자열 배열)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String recommendations;

    // 종합 분석
    @Column(columnDefinition = "TEXT")
    private String overallAnalysis;

    // 분석 시점의 오답 개수 (변경 감지용)
    @Column(nullable = false)
    private Integer analyzedWrongCount = 0;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public WeaknessAnalysis(LearningPath learningPath) {
        this.learningPath = learningPath;
    }
}
