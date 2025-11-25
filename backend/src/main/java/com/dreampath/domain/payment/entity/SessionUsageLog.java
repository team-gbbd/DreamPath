package com.dreampath.domain.payment.entity;

import com.dreampath.domain.user.entity.User;
import com.dreampath.domain.mentoring.entity.MentoringBooking;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 멘토링 세션 사용 내역 로그
 */
@Entity
@Table(name = "session_usage_logs")
@Getter
@Setter
public class SessionUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private MentoringBooking booking; // 예약 ID (예약 시 차감된 경우)

    @Column(name = "sessions_before", nullable = false)
    private int sessionsBefore; // 사용 전 잔여 횟수

    @Column(name = "sessions_after", nullable = false)
    private int sessionsAfter; // 사용 후 잔여 횟수

    @Column(name = "change_type", nullable = false, length = 20)
    private String changeType; // PURCHASE, USE, REFUND, CANCEL

    @Column(name = "description", columnDefinition = "TEXT")
    private String description; // 변경 사유 설명

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
