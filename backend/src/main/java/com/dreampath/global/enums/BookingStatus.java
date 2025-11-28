package com.dreampath.global.enums;

/**
 * 멘토링 예약 상태
 */
public enum BookingStatus {
    PENDING,    // 예약 대기 (멘토 확인 전)
    CONFIRMED,  // 예약 확정 (멘토 승인)
    REJECTED,   // 예약 거절 (멘토 거절)
    CANCELLED,  // 예약 취소 (멘티가 취소)
    COMPLETED   // 멘토링 완료
}
