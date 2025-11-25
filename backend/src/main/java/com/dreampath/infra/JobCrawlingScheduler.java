package com.dreampath.infra;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 채용 공고 크롤링 스케줄러
 * 매일 새벽에 자동으로 채용 사이트에서 공고를 크롤링합니다.
 */
@Slf4j
@Component
public class JobCrawlingScheduler {

    private final RestTemplate restTemplate;
    private final String pythonAiServiceUrl;
    private final boolean schedulerEnabled;

    public JobCrawlingScheduler(
            RestTemplate restTemplate,
            @Value("${python.ai.service.url:http://localhost:8000}") String pythonAiServiceUrl,
            @Value("${scheduler.job-crawling.enabled:true}") boolean schedulerEnabled) {
        this.restTemplate = restTemplate;
        this.pythonAiServiceUrl = pythonAiServiceUrl;
        this.schedulerEnabled = schedulerEnabled;
        log.info("채용 공고 크롤링 스케줄러 초기화 완료. 활성화: {}", schedulerEnabled);
    }

    /**
     * 매일 새벽 3시에 실행
     * Cron: 초 분 시 일 월 요일
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void crawlDailyJobs() {
        if (!schedulerEnabled) {
            log.info("스케줄러가 비활성화되어 있습니다.");
            return;
        }

        log.info("=== 매일 채용 공고 크롤링 시작 ===");
        LocalDateTime startTime = LocalDateTime.now();

        try {
            // 1. 원티드 크롤링
            crawlWanted();

            // 2. 잡코리아 크롤링 (선택적)
            // crawlJobKorea();

            // 3. 사람인 크롤링
            crawlSaramin();

            LocalDateTime endTime = LocalDateTime.now();
            log.info("=== 채용 공고 크롤링 완료. 소요 시간: {}초 ===",
                    java.time.Duration.between(startTime, endTime).getSeconds());

        } catch (Exception e) {
            log.error("채용 공고 크롤링 중 오류 발생", e);
        }
    }

    /**
     * 1시간마다 인기 공고 업데이트 (선택적)
     * 주석 해제하면 활성화
     */
    // @Scheduled(fixedRate = 3600000) // 1시간 = 3600000ms
    public void crawlHotJobs() {
        if (!schedulerEnabled) {
            return;
        }

        log.info("=== 인기 공고 업데이트 시작 ===");
        try {
            crawlWanted();
            log.info("=== 인기 공고 업데이트 완료 ===");
        } catch (Exception e) {
            log.error("인기 공고 업데이트 중 오류 발생", e);
        }
    }

    /**
     * 원티드 크롤링
     */
    private void crawlWanted() {
        try {
            String url = pythonAiServiceUrl + "/api/job-sites/crawl/wanted";

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("searchKeyword", null); // 전체 공고
            requestBody.put("maxResults", 100); // 최대 100개
            requestBody.put("forceRefresh", true); // 강제 새로고침

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            log.info("원티드 크롤링 시작...");
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                Integer totalResults = (Integer) body.get("totalResults");
                log.info("원티드 크롤링 완료. 총 {}개 공고 수집", totalResults);
            } else {
                log.warn("원티드 크롤링 실패: HTTP {}", response.getStatusCode());
            }

        } catch (Exception e) {
            log.error("원티드 크롤링 중 오류", e);
        }
    }

    /**
     * 잡코리아 크롤링 (선택적)
     */
    private void crawlJobKorea() {
        try {
            String url = pythonAiServiceUrl + "/api/job-sites/crawl";

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("siteName", "잡코리아");
            requestBody.put("siteUrl", "https://www.jobkorea.co.kr");
            requestBody.put("searchKeyword", null);
            requestBody.put("maxResults", 50);
            requestBody.put("forceRefresh", true);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            log.info("잡코리아 크롤링 시작...");
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                Integer totalResults = (Integer) body.get("totalResults");
                log.info("잡코리아 크롤링 완료. 총 {}개 공고 수집", totalResults);
            }

        } catch (Exception e) {
            log.error("잡코리아 크롤링 중 오류", e);
        }
    }

    /**
     * 사람인 크롤링 (선택적)
     */
    private void crawlSaramin() {
        try {
            String url = pythonAiServiceUrl + "/api/job-sites/crawl";

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("siteName", "사람인");
            requestBody.put("siteUrl", "https://www.saramin.co.kr");
            requestBody.put("searchKeyword", null);
            requestBody.put("maxResults", 50);
            requestBody.put("forceRefresh", true);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            log.info("사람인 크롤링 시작...");
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                Integer totalResults = (Integer) body.get("totalResults");
                log.info("사람인 크롤링 완료. 총 {}개 공고 수집", totalResults);
            }

        } catch (Exception e) {
            log.error("사람인 크롤링 중 오류", e);
        }
    }
}
