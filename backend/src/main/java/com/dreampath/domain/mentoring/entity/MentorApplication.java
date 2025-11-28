package com.dreampath.domain.mentoring.entity;

import com.dreampath.global.enums.MentorApplicationStatus;
import com.dreampath.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 멘토 신청 엔티티
 */
@Getter
@Setter
@Entity
@Table(name = "mentor_applications")
public class MentorApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long applicationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String domain; // 전문 분야

    @Column(nullable = false)
    private Integer experience; // 경력 (년)

    @Column(columnDefinition = "TEXT", nullable = false)
    private String bio; // 자기소개

    @Column(nullable = false)
    private Integer hourlyRate; // 시간당 가격

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MentorApplicationStatus status = MentorApplicationStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason; // 반려 사유 (선택)

    @Column
    private Long reviewedBy; // 심사한 관리자 ID (선택)

    @Column
    private LocalDateTime reviewedAt; // 심사 일시

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
