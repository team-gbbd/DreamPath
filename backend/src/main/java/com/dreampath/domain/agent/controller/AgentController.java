package com.dreampath.domain.agent.controller;

import com.dreampath.domain.agent.service.PythonAgentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI 에이전트 API 컨트롤러
 * Python AI Service의 AI 에이전트 기능을 프록시
 */
@Slf4j
@RestController
@RequestMapping("/api/agent")
@RequiredArgsConstructor
public class AgentController {

    private final PythonAgentService pythonAgentService;

    // ============== 1. 채용 공고 추천 ==============

    /**
     * 채용 공고 추천
     */
    @PostMapping("/job-recommendations")
    public ResponseEntity<Map<String, Object>> getJobRecommendations(@RequestBody Map<String, Object> request) {
        log.info("채용 공고 추천 요청: userId={}", request.get("userId"));
        try {
            Map<String, Object> response = pythonAgentService.getJobRecommendations(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("채용 공고 추천 실패", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "채용 공고 추천 실패: " + e.getMessage()));
        }
    }

    /**
     * 실시간 채용 공고 추천 (키워드 기반)
     */
    @PostMapping("/job-recommendations/realtime")
    public ResponseEntity<Map<String, Object>> getRealTimeRecommendations(@RequestBody Map<String, Object> request) {
        log.info("실시간 채용 공고 추천 요청: userId={}", request.get("userId"));
        try {
            Map<String, Object> response = pythonAgentService.getRealTimeRecommendations(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("실시간 채용 공고 추천 실패", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "실시간 채용 공고 추천 실패: " + e.getMessage()));
        }
    }

    // ============== 2. 지원 현황 추적 ==============

    /**
     * 지원 현황 분석
     */
    @PostMapping("/applications/analyze")
    public ResponseEntity<Map<String, Object>> analyzeApplications(@RequestBody Map<String, Object> request) {
        log.info("지원 현황 분석 요청: userId={}", request.get("userId"));
        try {
            Map<String, Object> response = pythonAgentService.analyzeApplications(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("지원 현황 분석 실패", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "지원 현황 분석 실패: " + e.getMessage()));
        }
    }

    /**
     * 특정 지원 건의 상태 추적 및 조언
     */
    @PostMapping("/applications/track")
    public ResponseEntity<Map<String, Object>> trackApplication(@RequestBody Map<String, Object> request) {
        log.info("지원 추적 요청: userId={}, applicationId={}",
                request.get("userId"), request.get("applicationId"));
        try {
            Map<String, Object> response = pythonAgentService.trackApplication(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("지원 추적 실패", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "지원 추적 실패: " + e.getMessage()));
        }
    }

    // ============== 3. 커리어 성장 제안 ==============

    /**
     * 커리어 갭 분석
     */
    @PostMapping("/career/gap-analysis")
    public ResponseEntity<Map<String, Object>> analyzeCareerGap(@RequestBody Map<String, Object> request) {
        log.info("커리어 갭 분석 요청: currentPosition={}, targetPosition={}",
                request.get("currentPosition"), request.get("targetPosition"));
        try {
            Map<String, Object> response = pythonAgentService.analyzeCareerGap(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("커리어 갭 분석 실패", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "커리어 갭 분석 실패: " + e.getMessage()));
        }
    }

    /**
     * 스킬 개발 제안
     */
    @PostMapping("/career/skill-development")
    public ResponseEntity<Map<String, Object>> suggestSkillDevelopment(@RequestBody Map<String, Object> request) {
        log.info("스킬 개발 제안 요청: targetPosition={}", request.get("targetPosition"));
        try {
            Map<String, Object> response = pythonAgentService.suggestSkillDevelopment(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("스킬 개발 제안 실패", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "스킬 개발 제안 실패: " + e.getMessage()));
        }
    }

    /**
     * 성장 타임라인 생성
     */
    @PostMapping("/career/timeline")
    public ResponseEntity<Map<String, Object>> createGrowthTimeline(@RequestBody Map<String, Object> request) {
        log.info("성장 타임라인 생성 요청: targetPosition={}", request.get("targetPosition"));
        try {
            Map<String, Object> response = pythonAgentService.createGrowthTimeline(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("성장 타임라인 생성 실패", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "성장 타임라인 생성 실패: " + e.getMessage()));
        }
    }

    /**
     * 시장 트렌드 분석
     */
    @PostMapping("/career/market-trends")
    public ResponseEntity<Map<String, Object>> analyzeMarketTrends(@RequestBody Map<String, Object> request) {
        log.info("시장 트렌드 분석 요청: targetCareer={}", request.get("targetCareer"));
        try {
            Map<String, Object> response = pythonAgentService.analyzeMarketTrends(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("시장 트렌드 분석 실패", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "시장 트렌드 분석 실패: " + e.getMessage()));
        }
    }

    // ============== 4. 이력서 최적화 ==============

    /**
     * 이력서 최적화
     */
    @PostMapping("/resume/optimize")
    public ResponseEntity<Map<String, Object>> optimizeResume(@RequestBody Map<String, Object> request) {
        log.info("이력서 최적화 요청");
        try {
            Map<String, Object> response = pythonAgentService.optimizeResume(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("이력서 최적화 실패", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "이력서 최적화 실패: " + e.getMessage()));
        }
    }

    /**
     * 이력서 품질 분석
     */
    @PostMapping("/resume/analyze")
    public ResponseEntity<Map<String, Object>> analyzeResumeQuality(@RequestBody Map<String, Object> request) {
        log.info("이력서 품질 분석 요청");
        try {
            Map<String, Object> response = pythonAgentService.analyzeResumeQuality(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("이력서 품질 분석 실패", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "이력서 품질 분석 실패: " + e.getMessage()));
        }
    }

    /**
     * 자기소개서 생성
     */
    @PostMapping("/resume/cover-letter")
    public ResponseEntity<Map<String, Object>> generateCoverLetter(@RequestBody Map<String, Object> request) {
        log.info("자기소개서 생성 요청");
        try {
            Map<String, Object> response = pythonAgentService.generateCoverLetter(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("자기소개서 생성 실패", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "자기소개서 생성 실패: " + e.getMessage()));
        }
    }

    /**
     * 포지션별 키워드 추천
     */
    @PostMapping("/resume/keywords")
    public ResponseEntity<Map<String, Object>> suggestKeywords(@RequestBody Map<String, Object> request) {
        log.info("키워드 추천 요청: targetPosition={}", request.get("targetPosition"));
        try {
            Map<String, Object> response = pythonAgentService.suggestKeywords(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("키워드 추천 실패", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "키워드 추천 실패: " + e.getMessage()));
        }
    }
}
