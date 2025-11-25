package com.dreampath.domain.mentoring.entity;

import com.dreampath.global.enums.MentorStatus;
import com.dreampath.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 멘토 엔티티 (신청 + 승인 통합)
 */
@Getter
@Setter
@Entity
@Table(name = "mentors")
public class Mentor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long mentorId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(length = 100)
    private String company; // 회사명

    @Column(length = 100)
    private String job; // 직업/직무

    @Column(length = 50)
    private String experience; // 경력 (예: "3년")

    @Column(columnDefinition = "TEXT")
    private String bio; // 자기소개

    @Column(columnDefinition = "TEXT")
    private String career; // 경력 상세

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> availableTime; // 가능 시간 (JSONB)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MentorStatus status = MentorStatus.PENDING;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
