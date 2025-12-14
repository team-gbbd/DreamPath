package com.dreampath.domain.agent.recommendation.controller;

import com.dreampath.domain.agent.recommendation.dto.RecommendationAgentRequest;
import com.dreampath.domain.agent.recommendation.service.RecommendationAgentService;
import com.dreampath.domain.agent.recommendation.service.RecommendationCacheService;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@Slf4j
@RestController
@RequestMapping("/api/recommendation")
@RequiredArgsConstructor
public class RecommendationAgentController {

    private final RecommendationAgentService service;
    private final RecommendationCacheService cacheService;

    @PostMapping("/run")
    public Mono<Map<String, Object>> run(@RequestBody RecommendationAgentRequest request) {
        // 1. 캐시 확인 (userId와 profileUpdatedAt이 있을 때만)
        if (request.getUserId() != null && request.getProfileUpdatedAt() != null) {
            Optional<Map<String, Object>> cached = cacheService.getCachedRecommendations(
                    request.getUserId(),
                    request.getProfileUpdatedAt());

            if (cached.isPresent()) {
                log.info("✅ 캐시 히트: userId={}, 즉시 반환", request.getUserId());
                return Mono.just(cached.get());
            }

            log.info("캐시 미스: userId={}, AI 추천 생성 시작", request.getUserId());
        } else {
            log.debug("캐시 조회 스킵: userId 또는 profileUpdatedAt 없음");
        }

        // 2. 캐시 미스 → AI 추천 생성
        return service.runRecommendation(request)
                .doOnSuccess(result -> {
                    // 3. 생성된 추천을 캐시에 저장
                    if (request.getUserId() != null) {
                        cacheService.saveRecommendations(request.getUserId(), result);
                    }
                })
                .doOnError(error -> {
                    log.error("추천 생성 실패: userId={}", request.getUserId(), error);
                });
    }

    /**
     * 특정 사용자의 추천 캐시를 무효화합니다 (Option 3).
     * 
     * @param userId 사용자 ID
     * @return 성공 메시지
     */
    @DeleteMapping("/cache/{userId}")
    public Mono<Map<String, Object>> clearCache(@PathVariable Long userId) {
        log.info("🗑️  캐시 삭제 요청: userId={}", userId);
        cacheService.invalidateCache(userId);
        return Mono.just(Map.of(
                "success", true,
                "message", "캐시가 성공적으로 삭제되었습니다.",
                "userId", userId));
    }

    /**
     * 모든 사용자의 추천 캐시를 무효화합니다 (관리자용).
     * 
     * @return 성공 메시지
     */
    @DeleteMapping("/cache/all")
    public Mono<Map<String, Object>> clearAllCache() {
        log.warn("🗑️  전체 캐시 삭제 요청");
        cacheService.invalidateAllCache();
        return Mono.just(Map.of(
                "success", true,
                "message", "전체 캐시가 성공적으로 삭제되었습니다."));
    }
}
