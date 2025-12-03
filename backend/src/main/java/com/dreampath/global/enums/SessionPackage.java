package com.dreampath.global.enums;

import lombok.Getter;

/**
 * 멘토링 이용권 패키지
 */
@Getter
public enum SessionPackage {
    SINGLE(1, 30000, "1회 이용권"),
    TRIPLE(3, 80000, "3회 이용권"),
    FIVE(5, 120000, "5회 이용권"),
    TEN(10, 200000, "10회 이용권");

    private final int sessions;      // 횟수
    private final int price;          // 가격 (원)
    private final String displayName; // 표시 이름

    SessionPackage(int sessions, int price, String displayName) {
        this.sessions = sessions;
        this.price = price;
        this.displayName = displayName;
    }

    /**
     * 할인율 계산
     */
    public int getDiscountRate() {
        int originalPrice = sessions * 30000; // 정가 (1회당 30,000원 기준)
        if (originalPrice == price) return 0;
        return (int) (((originalPrice - price) / (double) originalPrice) * 100);
    }

    /**
     * 패키지 이름으로 조회
     */
    public static SessionPackage fromName(String name) {
        for (SessionPackage pkg : values()) {
            if (pkg.name().equalsIgnoreCase(name)) {
                return pkg;
            }
        }
        throw new IllegalArgumentException("유효하지 않은 패키지: " + name);
    }
}
