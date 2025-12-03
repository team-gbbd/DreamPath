package com.dreampath.domain.payment.repository;

import com.dreampath.domain.payment.entity.Payment;
import com.dreampath.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // 사용자별 결제 내역 조회 (최신순)
    List<Payment> findByUserOrderByCreatedAtDesc(User user);

    // imp_uid로 결제 조회 (레거시 - 포트원)
    Optional<Payment> findByImpUid(String impUid);

    // payment_key로 결제 조회 (토스페이먼츠)
    Optional<Payment> findByPaymentKey(String paymentKey);

    // merchant_uid로 결제 조회 (중복 체크)
    Optional<Payment> findByMerchantUid(String merchantUid);

    // 사용자의 성공한 결제만 조회
    List<Payment> findByUserAndStatusOrderByCreatedAtDesc(User user, String status);
}
