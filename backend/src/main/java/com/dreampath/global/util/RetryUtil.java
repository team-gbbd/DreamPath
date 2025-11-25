package com.dreampath.global.util;

import java.util.concurrent.Callable;

public class RetryUtil {

    public static <T> T retry(Callable<T> job, int attempts) {
        for (int i = 0; i < attempts; i++) {
            try {
                return job.call();
            } catch (Exception e) {
                if (i == attempts - 1) {
                    throw new RuntimeException("재시도 실패: " + e.getMessage(), e);
                }
            }
        }
        return null;
    }
}
