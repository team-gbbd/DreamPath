package com.dreampath.controller;

import com.dreampath.dto.payment.*;
import com.dreampath.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
     * 결제 준비
     * POST /api/payments/prepare
     */
    @PostMapping("/prepare")
    public ResponseEntity<PaymentPrepareResponse> preparePayment(
            @Valid @RequestBody PaymentPrepareRequest request) {
        log.info("결제 준비 API - userId: {}, package: {}", request.getUserId(), request.getSessionPackage());

        PaymentPrepareResponse response = paymentService.preparePayment(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 결제 완료 (토스페이먼츠 검증)
     * POST /api/payments/complete
     */
    @PostMapping("/complete")
    public ResponseEntity<PaymentResponse> completePayment(
            @Valid @RequestBody PaymentCompleteRequest request) {
        log.info("결제 완료 API - userId: {}, paymentKey: {}, orderId: {}",
                request.getUserId(), request.getPaymentKey(), request.getOrderId());

        PaymentResponse response = paymentService.completePayment(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 결제 내역 조회
     * GET /api/payments/history/{userId}
     */
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<PaymentResponse>> getPaymentHistory(@PathVariable Long userId) {
        log.info("결제 내역 조회 API - userId: {}", userId);

        List<PaymentResponse> responses = paymentService.getPaymentHistory(userId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 사용 내역 조회
     * GET /api/payments/usage/{userId}
     */
    @GetMapping("/usage/{userId}")
    public ResponseEntity<List<SessionUsageResponse>> getUsageHistory(@PathVariable Long userId) {
        log.info("사용 내역 조회 API - userId: {}", userId);

        List<SessionUsageResponse> responses = paymentService.getUsageHistory(userId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 잔여 횟수 조회
     * GET /api/payments/remaining/{userId}
     */
    @GetMapping("/remaining/{userId}")
    public ResponseEntity<Integer> getRemainingSessions(@PathVariable Long userId) {
        log.info("잔여 횟수 조회 API - userId: {}", userId);

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
}
