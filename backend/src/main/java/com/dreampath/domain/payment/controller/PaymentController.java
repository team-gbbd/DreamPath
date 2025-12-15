package com.dreampath.domain.payment.controller;

import com.dreampath.domain.payment.dto.*;
import com.dreampath.domain.payment.service.PaymentService;
import com.dreampath.global.jwt.JwtUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * 결제 관련 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * 결제 준비 (본인만 가능)
     * POST /api/payments/prepare
     */
    @PostMapping("/prepare")
    public ResponseEntity<PaymentPrepareResponse> preparePayment(
            @Valid @RequestBody PaymentPrepareRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("결제 준비 API - userId: {}, package: {}", request.getUserId(), request.getSessionPackage());

        validateOwnership(principal, request.getUserId());

        PaymentPrepareResponse response = paymentService.preparePayment(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 결제 완료 (토스페이먼츠 검증, 본인만 가능)
     * POST /api/payments/complete
     */
    @PostMapping("/complete")
    public ResponseEntity<PaymentResponse> completePayment(
            @Valid @RequestBody PaymentCompleteRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("결제 완료 API - userId: {}, paymentKey: {}, orderId: {}",
                request.getUserId(), request.getPaymentKey(), request.getOrderId());

        validateOwnership(principal, request.getUserId());

        PaymentResponse response = paymentService.completePayment(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 결제 내역 조회 (본인만 조회 가능)
     * GET /api/payments/history/{userId}
     */
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<PaymentResponse>> getPaymentHistory(
            @PathVariable Long userId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("결제 내역 조회 API - userId: {}", userId);

        validateOwnership(principal, userId);

        List<PaymentResponse> responses = paymentService.getPaymentHistory(userId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 사용 내역 조회 (본인만 조회 가능)
     * GET /api/payments/usage/{userId}
     */
    @GetMapping("/usage/{userId}")
    public ResponseEntity<List<SessionUsageResponse>> getUsageHistory(
            @PathVariable Long userId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("사용 내역 조회 API - userId: {}", userId);

        validateOwnership(principal, userId);

        List<SessionUsageResponse> responses = paymentService.getUsageHistory(userId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 잔여 횟수 조회 (본인만 조회 가능)
     * GET /api/payments/remaining/{userId}
     */
    @GetMapping("/remaining/{userId}")
    public ResponseEntity<Integer> getRemainingSessions(
            @PathVariable Long userId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        log.info("잔여 횟수 조회 API - userId: {}", userId);

        validateOwnership(principal, userId);

        int remaining = paymentService.getRemainingSessions(userId);
        return ResponseEntity.ok(remaining);
    }

    /**
     * 토스페이먼츠 Webhook (테스트용)
     * POST /api/payments/webhook
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> tossWebhook(@RequestBody String payload) {
        log.info("토스페이먼츠 Webhook 수신: {}", payload);

        // TODO: 실제로는 토스페이먼츠 Webhook 서명 검증 후 처리
        // 테스트 모드에서는 로그만 남김

        return ResponseEntity.ok("OK");
    }

    /**
     * 본인 확인 헬퍼 메서드
     */
    private void validateOwnership(JwtUserPrincipal principal, Long userId) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        if (!principal.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "접근 권한이 없습니다.");
        }
    }
}
