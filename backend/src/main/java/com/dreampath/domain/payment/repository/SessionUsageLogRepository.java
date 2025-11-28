package com.dreampath.domain.payment.repository;

import com.dreampath.domain.payment.entity.SessionUsageLog;
import com.dreampath.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SessionUsageLogRepository extends JpaRepository<SessionUsageLog, Long> {

    // 사용자별 사용 내역 조회 (최신순)
    List<SessionUsageLog> findByUserOrderByCreatedAtDesc(User user);

    // 사용자의 특정 타입 내역 조회
    List<SessionUsageLog> findByUserAndChangeTypeOrderByCreatedAtDesc(User user, String changeType);
}
