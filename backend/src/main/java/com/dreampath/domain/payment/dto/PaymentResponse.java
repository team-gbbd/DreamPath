package com.dreampath.domain.payment.dto;

import com.dreampath.domain.payment.entity.Payment;
import com.dreampath.global.enums.SessionPackage;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 결제 응답 DTO
 */
@Data
@Builder
public class PaymentResponse {
    private Long paymentId;
    private Long userId;
    private int amount;
    private SessionPackage sessionPackage;
    private int sessionsPurchased;
    private String paymentMethod;
    private String impUid;
    private String merchantUid;
    private String status;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;

    public static PaymentResponse from(Payment payment) {
        return PaymentResponse.builder()
                .paymentId(payment.getPaymentId())
                .userId(payment.getUser().getUserId())
                .amount(payment.getAmount())
                .sessionPackage(payment.getSessionPackage())
                .sessionsPurchased(payment.getSessionsPurchased())
                .paymentMethod(payment.getPaymentMethod())
                .impUid(payment.getImpUid())
                .merchantUid(payment.getMerchantUid())
                .status(payment.getStatus())
                .paidAt(payment.getPaidAt())
                .createdAt(payment.getCreatedAt())
                .build();
    }
}
