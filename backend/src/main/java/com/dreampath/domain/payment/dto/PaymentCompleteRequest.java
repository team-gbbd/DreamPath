package com.dreampath.domain.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 결제 완료 요청 DTO (토스페이먼츠 검증용)
 */
@Data
public class PaymentCompleteRequest {

    @NotNull(message = "사용자 ID는 필수입니다.")
    private Long userId;

    @NotBlank(message = "결제 키는 필수입니다.")
    private String paymentKey; // 토스페이먼츠 거래 고유키

    @NotBlank(message = "주문 ID는 필수입니다.")
    private String orderId; // 주문 ID (merchantUid)

    @NotNull(message = "결제 금액은 필수입니다.")
    private Integer amount; // 결제 금액 (검증용)
}
