package com.dreampath.dto.payment;

import com.dreampath.enums.SessionPackage;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 결제 준비 요청 DTO
 */
@Data
public class PaymentPrepareRequest {

    @NotNull(message = "사용자 ID는 필수입니다.")
    private Long userId;

    @NotNull(message = "패키지 선택은 필수입니다.")
    private SessionPackage sessionPackage;
}
