package com.dreampath.domain.recommendation.service;

import com.dreampath.domain.recommendation.entity.JobRecommendation;
import com.dreampath.domain.recommendation.entity.MajorRecommendation;
import com.dreampath.domain.recommendation.repository.JobRecommendationRepository;
import com.dreampath.domain.recommendation.repository.MajorRecommendationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationStorageService {

    private final JobRecommendationRepository jobRecommendationRepository;
    private final MajorRecommendationRepository majorRecommendationRepository;
    private final RecommendService recommendService;
    private final ObjectMapper objectMapper;

    /**
     * 사용자의 추천 결과를 업데이트합니다.
     * 기존 추천을 삭제하고 새로운 추천을 저장합니다.
     */
    @Transactional
    public void updateRecommendations(Long userId, String vectorId) {
        if (vectorId == null || vectorId.isBlank()) {
            log.warn("Vector ID가 없어 추천 결과를 저장하지 않습니다. userId: {}", userId);
            return;
        }

        try {
            // 1. 기존 추천 삭제
            deleteExistingRecommendations(userId);

            // 2. 새 추천 저장
            saveJobRecommendations(userId, vectorId);
            saveMajorRecommendations(userId, vectorId);

            log.info("추천 결과 업데이트 완료. userId: {}, vectorId: {}", userId, vectorId);
        } catch (Exception e) {
            log.error("추천 결과 저장 실패. userId: {}, vectorId: {}", userId, vectorId, e);
        }
    }

    /**
     * 기존 추천 결과를 삭제합니다.
     */
    @Transactional
    public void deleteExistingRecommendations(Long userId) {
        jobRecommendationRepository.deleteByUserId(userId);
        majorRecommendationRepository.deleteByUserId(userId);
        log.debug("기존 추천 결과 삭제 완료. userId: {}", userId);
    }

    /**
     * 직업 추천 결과를 저장합니다.
     */
    private void saveJobRecommendations(Long userId, String vectorId) {
        try {
            Map<String, Object> response = recommendService.recommendHybridJob(vectorId, 10);
            Object recommended = response.get("recommended");

            if (recommended instanceof List<?> list) {
                for (Object item : list) {
                    if (item instanceof Map<?, ?> jobMap) {
                        saveJobRecommendation(userId, jobMap);
                    }
                }
                log.info("직업 추천 {}개 저장 완료. userId: {}", list.size(), userId);
            }
        } catch (Exception e) {
            log.error("직업 추천 저장 실패. userId: {}", userId, e);
        }
    }

    /**
     * 학과 추천 결과를 저장합니다.
     */
    private void saveMajorRecommendations(Long userId, String vectorId) {
        try {
            List<?> majors = recommendService.recommendMajor(vectorId);

            for (Object item : majors) {
                if (item instanceof Map<?, ?> majorMap) {
                    saveMajorRecommendation(userId, majorMap);
                }
            }
            log.info("학과 추천 {}개 저장 완료. userId: {}", majors.size(), userId);
        } catch (Exception e) {
            log.error("학과 추천 저장 실패. userId: {}", userId, e);
        }
    }

    /**
     * 개별 직업 추천을 저장합니다.
     */
    private void saveJobRecommendation(Long userId, Map<?, ?> jobMap) {
        try {
            Map<?, ?> metadata = (Map<?, ?>) jobMap.get("metadata");

            String jobName = getStringValue(jobMap, "title");
            if (jobName == null)
                jobName = getStringValue(jobMap, "job_name");
            if (jobName == null)
                jobName = getStringValue(jobMap, "jobName");
            if (jobName == null)
                jobName = getStringValue(jobMap, "job_nm");
            if (jobName == null)
                jobName = getStringValue(metadata, "jobName");
            if (jobName == null)
                jobName = "이름 미확인";

            JobRecommendation recommendation = JobRecommendation.builder()
                    .userId(userId)
                    .jobCode(getStringValue(metadata, "job_code"))
                    .jobName(jobName)
                    .matchScore(getDoubleValue(jobMap, "score"))
                    .category(getStringValue(metadata, "job_category"))
                    .description(getStringValue(metadata, "description"))
                    .metadata(objectMapper.writeValueAsString(metadata))
                    .build();

            jobRecommendationRepository.save(recommendation);
        } catch (Exception e) {
            log.error("직업 추천 항목 저장 실패. userId: {}, job: {}", userId, jobMap, e);
        }
    }

    /**
     * 개별 학과 추천을 저장합니다.
     */
    private void saveMajorRecommendation(Long userId, Map<?, ?> majorMap) {
        try {
            Map<?, ?> metadata = (Map<?, ?>) majorMap.get("metadata");

            String majorName = getStringValue(majorMap, "title");
            if (majorName == null)
                majorName = getStringValue(majorMap, "major_name");
            if (majorName == null)
                majorName = getStringValue(majorMap, "majorName");
            if (majorName == null)
                majorName = getStringValue(majorMap, "major_nm");
            if (majorName == null)
                majorName = getStringValue(metadata, "deptName");
            if (majorName == null)
                majorName = "학과명 미확인";

            MajorRecommendation recommendation = MajorRecommendation.builder()
                    .userId(userId)
                    .majorCode(getStringValue(metadata, "major_code"))
                    .majorName(majorName)
                    .matchScore(getDoubleValue(majorMap, "score"))
                    .category(getStringValue(metadata, "lClass", getStringValue(metadata, "field")))
                    .description(getStringValue(metadata, "description"))
                    .metadata(objectMapper.writeValueAsString(metadata))
                    .build();

            majorRecommendationRepository.save(recommendation);
        } catch (Exception e) {
            log.error("학과 추천 항목 저장 실패. userId: {}, major: {}", userId, majorMap, e);
        }
    }

    /**
     * Map에서 String 값을 안전하게 추출합니다.
     */
    private String getStringValue(Map<?, ?> map, String key) {
        if (map == null)
            return null;
        Object value = map.get(key);
        return value != null ? String.valueOf(value) : null;
    }

    /**
     * Map에서 String 값을 안전하게 추출합니다 (기본값 지원).
     */
    private String getStringValue(Map<?, ?> map, String key, String defaultValue) {
        String value = getStringValue(map, key);
        return value != null ? value : defaultValue;
    }

    /**
     * Map에서 Double 값을 안전하게 추출합니다.
     */
    private Double getDoubleValue(Map<?, ?> map, String key) {
        if (map == null)
            return 0.0;
        Object value = map.get(key);
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return 0.0;
    }
}
