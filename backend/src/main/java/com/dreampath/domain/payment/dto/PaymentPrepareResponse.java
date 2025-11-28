package com.dreampath.domain.payment.dto;

import lombok.Builder;
import lombok.Data;

/**
 * 결제 준비 응답 DTO
 */
@Data
@Builder
public class PaymentPrepareResponse {
    private String orderId;        // 주문 ID (merchantUid)
    private String orderName;      // 주문명
    private int amount;            // 결제 금액
    private int sessions;          // 구매 횟수
    private String packageName;    // 패키지 이름
}
