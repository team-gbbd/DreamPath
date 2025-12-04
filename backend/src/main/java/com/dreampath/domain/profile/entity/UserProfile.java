package com.dreampath.domain.profile.entity;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * UserProfile - 문서 저장용 데이터 모델
 * 
 * 주의: 이 엔티티는 입력 폼 기능 없이 '문서 저장소' 역할만 수행합니다.
 * 실제 데이터는 채팅 기반 분석 결과에서 생성됩니다.
 */
@Entity
@Table(name = "user_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "profile_id")
    private Long profileId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "personality", columnDefinition = "TEXT")
    private String personality;

    @Column(name = "values", columnDefinition = "TEXT")
    private String values;

    @Column(name = "emotions", columnDefinition = "TEXT")
    private String emotions;

    @Column(name = "interests", columnDefinition = "TEXT")
    private String interests;

    @Type(JsonBinaryType.class)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * 벡터 임베딩을 위한 통합 문서 생성
     * 명시적 라벨을 포함하여 AI가 각 필드의 의미를 정확히 이해할 수 있도록 함
     */
    public String toDocument() {
        StringBuilder doc = new StringBuilder();
        
        if (personality != null && !personality.isBlank()) {
            doc.append("성격 특성: ").append(personality).append("\n");
        }
        if (values != null && !values.isBlank()) {
            doc.append("가치관: ").append(values).append("\n");
        }
        if (emotions != null && !emotions.isBlank()) {
            doc.append("감정 패턴: ").append(emotions).append("\n");
        }
        if (interests != null && !interests.isBlank()) {
            doc.append("관심사: ").append(interests).append("\n");
        }
        
        return doc.toString().trim();
    }
}
