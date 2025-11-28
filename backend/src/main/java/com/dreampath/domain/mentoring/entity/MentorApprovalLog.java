package com.dreampath.domain.mentoring.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 멘토 승인/거절 이력
 */
@Getter
@Setter
@Entity
@Table(name = "mentor_approval_logs")
public class MentorApprovalLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mentor_id", nullable = false)
    private Mentor mentor;

    @Column(name = "approved_by")
    private Long approvedBy; // 승인/거절한 관리자 user_id

    @Column(length = 20)
    private String previousStatus;

    @Column(length = 20)
    private String newStatus;

    @Column(columnDefinition = "TEXT")
    private String reason; // 승인/거절 사유

    @CreationTimestamp
    private LocalDateTime createdAt;
}
