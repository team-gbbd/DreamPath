package com.dreampath.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_profiles")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long profileId;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(columnDefinition = "jsonb")
    private String personalityTraits;

    @Column(columnDefinition = "jsonb")
    private String values;

    @Column(columnDefinition = "jsonb")
    private String emotions;

    @Column(columnDefinition = "jsonb")
    private String interests;

    private Double confidenceScore;

    private LocalDateTime lastAnalyzedAt;

    public String toDocument() {
        return String.join(" ",
                this.personalityTraits == null ? "" : this.personalityTraits,
                this.values == null ? "" : this.values,
                this.emotions == null ? "" : this.emotions,
                this.interests == null ? "" : this.interests
        );
    }
}
