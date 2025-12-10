package com.dreampath.domain.profile.entity;

import com.dreampath.common.converter.JsonConverter;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "profile_analysis")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long analysisId;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Column(columnDefinition = "TEXT")
    private String personality;

    @Column(columnDefinition = "TEXT")
    private String values;

    @Column(columnDefinition = "TEXT")
    private String emotions;

    @Column(columnDefinition = "TEXT")
    private String interests;

    private Double confidenceScore;

    @Column(length = 64)
    private String contentHash; // 프로필 변경 감지용 해시

    @Column(name = "mbti")
    private String mbti;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Convert(converter = JsonConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> strengths;

    @Convert(converter = JsonConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> risks;

    @Convert(converter = JsonConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> goals;

    @Convert(converter = JsonConverter.class)
    @Column(name = "values_list", columnDefinition = "TEXT")
    private List<String> valuesList;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
