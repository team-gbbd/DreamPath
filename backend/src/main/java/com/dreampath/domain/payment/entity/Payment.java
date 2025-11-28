package com.dreampath.domain.payment.entity;

import com.dreampath.global.enums.SessionPackage;
import com.dreampath.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 결제 내역 엔티티
 */
@Entity
@Table(name = "payments")
@Getter
@Setter
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id")
    private Long paymentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "amount", nullable = false)
    private int amount; // 결제 금액 (원)

    @Enumerated(EnumType.STRING)
    @Column(name = "session_package", nullable = false)
    private SessionPackage sessionPackage; // 구매한 패키지

    @Column(name = "sessions_purchased", nullable = false)
    private int sessionsPurchased; // 구매한 횟수

    @Column(name = "payment_method", length = 50)
    private String paymentMethod; // 결제 수단 (card, trans, vbank 등)

    @Column(name = "imp_uid", unique = true, length = 100)
    private String impUid; // 포트원 거래 고유번호 (레거시)

    @Column(name = "payment_key", unique = true, length = 200)
    private String paymentKey; // 토스페이먼츠 거래 고유키

    @Column(name = "merchant_uid", unique = true, nullable = false, length = 100)
    private String merchantUid; // 가맹점 주문번호 (orderId)

    @Column(name = "order_name", length = 100)
    private String orderName; // 주문명 (토스페이먼츠)

    @Column(name = "status", nullable = false, length = 20)
    private String status; // paid, failed, cancelled

    @Column(name = "paid_at")
    private LocalDateTime paidAt; // 결제 완료 시각

    @Column(name = "fail_reason", columnDefinition = "TEXT")
    private String failReason; // 실패 사유

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
