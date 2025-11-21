package com.dreampath.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "profile_vector")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProfileVector {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // user_profiles.profile_id 참조
    @Column(name = "profile_id")
    private Long profileId;

    // Pinecone vector ID
    @Column(name = "vector_db_id")
    private String vectorDbId;

    // 성향 분석에 사용된 원본 텍스트(document)
    @Column(name = "original_text", columnDefinition = "TEXT")
    private String originalText;

    // 문서 타입, 분석 버전 등
    @Column(columnDefinition = "jsonb")
    private String metadata;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
