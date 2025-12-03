package com.dreampath.domain.mentoring.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 멘토링 세션 엔티티
 * 멘토가 개별적으로 등록하는 멘토링 세션 정보
 */
@Getter
@Setter
@Entity
@Table(name = "mentoring_sessions")
public class MentoringSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mentor_id", nullable = false)
    private Mentor mentor;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private LocalDateTime sessionDate;

    @Column(nullable = false)
    private Integer durationMinutes = 60;

    @Column(nullable = false)
    private Integer price = 0;

    @Column(nullable = false)
    private Integer currentParticipants = 0;

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // 비즈니스 로직 메서드 (1:1 멘토링 고정)
    public boolean isFull() {
        return currentParticipants >= 1;
    }

    public void incrementParticipants() {
        if (isFull()) {
            throw new RuntimeException("이미 예약된 세션입니다.");
        }
        this.currentParticipants = 1;
    }

    public void decrementParticipants() {
        this.currentParticipants = 0;
    }

    public int getAvailableSlots() {
        return isFull() ? 0 : 1;
    }
}
