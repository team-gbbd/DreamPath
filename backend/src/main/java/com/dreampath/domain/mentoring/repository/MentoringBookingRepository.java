package com.dreampath.domain.mentoring.repository;

import com.dreampath.domain.mentoring.entity.Mentor;
import com.dreampath.domain.mentoring.entity.MentoringBooking;
import com.dreampath.domain.user.entity.User;
import com.dreampath.global.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MentoringBookingRepository extends JpaRepository<MentoringBooking, Long> {

    // 멘티의 모든 예약 조회 (최신순)
    List<MentoringBooking> findByMenteeOrderByCreatedAtDesc(User mentee);

    // 멘티의 상태별 예약 조회
    List<MentoringBooking> findByMenteeAndStatusOrderByCreatedAtDesc(
            User mentee, BookingStatus status);

    // 특정 세션의 예약 조회
    @Query("SELECT b FROM MentoringBooking b WHERE b.session.sessionId = :sessionId ORDER BY b.createdAt DESC")
    List<MentoringBooking> findBySessionIdOrderByCreatedAtDesc(@Param("sessionId") Long sessionId);

    // 멘토 ID로 예약 조회 (세션 기반)
    @Query("SELECT b FROM MentoringBooking b WHERE b.session.mentor.mentorId = :mentorId ORDER BY b.createdAt DESC")
    List<MentoringBooking> findByMentorIdOrderByCreatedAtDesc(@Param("mentorId") Long mentorId);

    // 멘토 ID와 상태로 예약 조회
    @Query("SELECT b FROM MentoringBooking b WHERE b.session.mentor.mentorId = :mentorId AND b.status = :status ORDER BY b.createdAt DESC")
    List<MentoringBooking> findByMentorIdAndStatusOrderByCreatedAtDesc(
            @Param("mentorId") Long mentorId,
            @Param("status") BookingStatus status);
}
