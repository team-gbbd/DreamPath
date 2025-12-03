package com.dreampath.domain.mentoring.entity;

import com.dreampath.global.enums.BookingStatus;
import com.dreampath.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 멘토링 예약 엔티티
 */
@Entity
@Table(name = "mentoring_bookings")
@Getter
@Setter
public class MentoringBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "booking_id")
    private Long bookingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private MentoringSession session; // 예약한 세션

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mentee_id", nullable = false)
    private User mentee; // 멘티 (예약하는 사람)

    @Column(name = "booking_date", nullable = false)
    private String bookingDate; // 예약 날짜 (YYYY-MM-DD) - 중복 방지용

    @Column(name = "time_slot", nullable = false)
    private String timeSlot; // 예약 시간대 (09:00-10:00) - 중복 방지용

    @Column(name = "message", columnDefinition = "TEXT")
    private String message; // 멘티가 남긴 메시지

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private BookingStatus status;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason; // 거절 사유 (멘토가 거절한 경우)

    @Column(name = "meeting_url")
    private String meetingUrl; // 화상 회의 URL (확정 시 생성)

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
