package com.dreampath.domain.payment.service;

import com.dreampath.domain.payment.dto.*;
import com.dreampath.domain.payment.entity.Payment;
import com.dreampath.domain.payment.entity.SessionUsageLog;
import com.dreampath.domain.user.entity.User;
import com.dreampath.global.enums.SessionPackage;
import com.dreampath.global.exception.ResourceNotFoundException;
import com.dreampath.domain.payment.repository.PaymentRepository;
import com.dreampath.domain.payment.repository.SessionUsageLogRepository;
import com.dreampath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final SessionUsageLogRepository sessionUsageLogRepository;
    private final UserRepository userRepository;

    /**
     * 결제 준비 - 주문 ID 및 정보 생성
     */
    public PaymentPrepareResponse preparePayment(PaymentPrepareRequest request) {
        log.info("결제 준비 - userId: {}, package: {}", request.getUserId(), request.getSessionPackage());

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getUserId()));

        SessionPackage pkg = request.getSessionPackage();

        // 주문 ID 생성 (UUID 기반)
        String orderId = "ORDER_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);

        // 주문명 생성
        String orderName = pkg.getDisplayName() + " 구매";

        return PaymentPrepareResponse.builder()
                .orderId(orderId)
                .orderName(orderName)
                .amount(pkg.getPrice())
                .sessions(pkg.getSessions())
                .packageName(pkg.getDisplayName())
                .build();
    }

    /**
     * 결제 완료 처리 (토스페이먼츠 검증)
     */
    @Transactional
    public PaymentResponse completePayment(PaymentCompleteRequest request) {
        log.info("결제 완료 처리 - userId: {}, paymentKey: {}, orderId: {}, amount: {}",
                request.getUserId(), request.getPaymentKey(), request.getOrderId(), request.getAmount());

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getUserId()));

        // 중복 결제 체크 (paymentKey와 orderId 둘 다 체크)
        if (paymentRepository.findByPaymentKey(request.getPaymentKey()).isPresent()) {
            log.warn("이미 처리된 결제 (paymentKey 중복): {}", request.getPaymentKey());
            throw new RuntimeException("이미 처리된 결제입니다.");
        }

        if (paymentRepository.findByMerchantUid(request.getOrderId()).isPresent()) {
            log.warn("이미 처리된 결제 (orderId 중복): {}", request.getOrderId());
            throw new RuntimeException("이미 처리된 결제입니다.");
        }

        // TODO: 실제 토스페이먼츠 API 호출하여 결제 검증
        // POST https://api.tosspayments.com/v1/payments/confirm
        // Authorization: Basic {Base64(secretKey + ':')}
        // Body: { paymentKey, orderId, amount }
        // 테스트 모드에서는 검증 생략하고 바로 처리

        // 금액으로 패키지 역추출
        SessionPackage pkg = detectPackageFromAmount(request.getAmount());

        int sessionsBefore = user.getRemainingSessions();
        int sessionsPurchased = pkg.getSessions();

        // 결제 내역 저장
        Payment payment = new Payment();
        payment.setUser(user);
        payment.setAmount(request.getAmount());
        payment.setSessionPackage(pkg);
        payment.setSessionsPurchased(sessionsPurchased);
        payment.setPaymentMethod("카드"); // 테스트: 임시로 카드
        payment.setPaymentKey(request.getPaymentKey());
        payment.setMerchantUid(request.getOrderId());
        payment.setOrderName(pkg.getDisplayName() + " 구매");
        payment.setStatus("paid");
        payment.setPaidAt(LocalDateTime.now());

        Payment savedPayment = paymentRepository.save(payment);

        // 사용자 잔여 횟수 충전
        user.setRemainingSessions(sessionsBefore + sessionsPurchased);
        userRepository.save(user);

        // 사용 로그 저장
        SessionUsageLog usageLog = new SessionUsageLog();
        usageLog.setUser(user);
        usageLog.setBooking(null);
        usageLog.setSessionsBefore(sessionsBefore);
        usageLog.setSessionsAfter(user.getRemainingSessions());
        usageLog.setChangeType("PURCHASE");
        usageLog.setDescription(pkg.getDisplayName() + " 구매");
        sessionUsageLogRepository.save(usageLog);

        log.info("결제 완료 - paymentId: {}, 충전 전: {}, 충전 후: {}",
                savedPayment.getPaymentId(), sessionsBefore, user.getRemainingSessions());

        return PaymentResponse.from(savedPayment);
    }

    /**
     * 결제 내역 조회
     */
    public List<PaymentResponse> getPaymentHistory(Long userId) {
        log.info("결제 내역 조회 - userId: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        return paymentRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(PaymentResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 사용 내역 조회
     */
    public List<SessionUsageResponse> getUsageHistory(Long userId) {
        log.info("사용 내역 조회 - userId: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        return sessionUsageLogRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(SessionUsageResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 잔여 횟수 조회
     */
    public int getRemainingSessions(Long userId) {
        log.info("잔여 횟수 조회 - userId: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        return user.getRemainingSessions();
    }

    /**
     * 세션 사용 (예약 생성 시 호출)
     */
    @Transactional
    public void useSessions(Long userId, int count, Long bookingId, String description) {
        log.info("세션 사용 - userId: {}, count: {}, bookingId: {}", userId, count, bookingId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        int sessionsBefore = user.getRemainingSessions();

        if (sessionsBefore < count) {
            throw new RuntimeException("잔여 횟수가 부족합니다. (현재: " + sessionsBefore + "회)");
        }

        // 횟수 차감
        user.setRemainingSessions(sessionsBefore - count);
        userRepository.save(user);

        // 사용 로그 저장
        SessionUsageLog usageLog = new SessionUsageLog();
        usageLog.setUser(user);
        usageLog.setBooking(null); // TODO: booking 객체 전달 필요
        usageLog.setSessionsBefore(sessionsBefore);
        usageLog.setSessionsAfter(user.getRemainingSessions());
        usageLog.setChangeType("USE");
        usageLog.setDescription(description != null ? description : "멘토링 예약");
        sessionUsageLogRepository.save(usageLog);

        log.info("세션 사용 완료 - 사용 전: {}, 사용 후: {}", sessionsBefore, user.getRemainingSessions());
    }

    /**
     * 세션 환불 (예약 취소/거절 시 호출)
     */
    @Transactional
    public void refundSessions(Long userId, int count, Long bookingId, String description) {
        log.info("세션 환불 - userId: {}, count: {}, bookingId: {}", userId, count, bookingId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        int sessionsBefore = user.getRemainingSessions();

        // 횟수 복구
        user.setRemainingSessions(sessionsBefore + count);
        userRepository.save(user);

        // 환불 로그 저장
        SessionUsageLog usageLog = new SessionUsageLog();
        usageLog.setUser(user);
        usageLog.setBooking(null); // TODO: booking 객체 전달 필요
        usageLog.setSessionsBefore(sessionsBefore);
        usageLog.setSessionsAfter(user.getRemainingSessions());
        usageLog.setChangeType("REFUND");
        usageLog.setDescription(description != null ? description : "예약 취소");
        sessionUsageLogRepository.save(usageLog);

        log.info("세션 환불 완료 - 환불 전: {}, 환불 후: {}", sessionsBefore, user.getRemainingSessions());
    }

    /**
     * 금액으로 패키지 역추출 (임시 메서드)
     * TODO: 실제로는 preparePayment 응답을 캐시에 저장하고 가져와야 함
     */
    private SessionPackage detectPackageFromAmount(int amount) {
        for (SessionPackage pkg : SessionPackage.values()) {
            if (pkg.getPrice() == amount) {
                return pkg;
            }
        }
        return SessionPackage.SINGLE; // 기본값
    }
}
