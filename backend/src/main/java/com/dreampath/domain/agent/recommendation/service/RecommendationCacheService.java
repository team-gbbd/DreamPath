package com.dreampath.domain.agent.recommendation.service;

import com.dreampath.domain.recommendation.entity.JobRecommendation;
import com.dreampath.domain.recommendation.entity.MajorRecommendation;
import com.dreampath.domain.recommendation.repository.JobRecommendationRepository;
import com.dreampath.domain.recommendation.repository.MajorRecommendationRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationCacheService {

    private final JobRecommendationRepository jobRecommendationRepository;
    private final MajorRecommendationRepository majorRecommendationRepository;
    private final ObjectMapper objectMapper;

    /**
     * 캐시된 추천 결과를 조회합니다.
     * 
     * @param userId           사용자 ID
     * @param profileUpdatedAt 프로필 마지막 수정 시간
     * @return 캐시된 추천 결과 (캐시 미스 시 empty)
     */
    public Optional<Map<String, Object>> getCachedRecommendations(Long userId, LocalDateTime profileUpdatedAt) {
        if (userId == null || profileUpdatedAt == null) {
            log.debug("캐시 조회 스킵: userId 또는 profileUpdatedAt이 null");
            return Optional.empty();
        }

        try {
            List<JobRecommendation> jobs = jobRecommendationRepository.findByUserId(userId);
            List<MajorRecommendation> majors = majorRecommendationRepository.findByUserId(userId);

            // 캐시가 없으면 미스
            if (jobs.isEmpty() && majors.isEmpty()) {
                log.debug("캐시 미스: userId={}, 저장된 추천 없음", userId);
                return Optional.empty();
            }

            // 캐시 유효성 검증: 프로필 수정 시간보다 캐시가 오래되었으면 무효
            LocalDateTime cacheCreatedAt = jobs.isEmpty()
                    ? majors.get(0).getCreatedAt()
                    : jobs.get(0).getCreatedAt();

            if (cacheCreatedAt.isBefore(profileUpdatedAt)) {
                log.info("캐시 무효: userId={}, 프로필이 캐시보다 최신 (profile: {}, cache: {})",
                        userId, profileUpdatedAt, cacheCreatedAt);
                return Optional.empty();
            }

            // 캐시 히트!
            log.info("✅ 캐시 히트: userId={}, jobs={}, majors={}", userId, jobs.size(), majors.size());

            Map<String, Object> result = new HashMap<>();
            result.put("jobs", convertJobsToMap(jobs));
            result.put("majors", convertMajorsToMap(majors));
            result.put("jobExplanations", extractJobExplanations(jobs));
            result.put("majorExplanations", extractMajorExplanations(majors));

            return Optional.of(result);
        } catch (Exception e) {
            log.error("캐시 조회 실패: userId={}", userId, e);
            return Optional.empty();
        }
    }

    /**
     * 추천 결과를 캐시에 저장합니다.
     * 기존 캐시를 삭제하고 새로운 결과를 저장합니다.
     * 
     * @param userId          사용자 ID
     * @param recommendations AI 추천 결과
     */
    @Transactional
    public void saveRecommendations(Long userId, Map<String, Object> recommendations) {
        if (userId == null) {
            log.warn("캐시 저장 스킵: userId가 null");
            return;
        }

        try {
            // 1. 기존 캐시 삭제 (최근 1개만 유지)
            jobRecommendationRepository.deleteByUserId(userId);
            majorRecommendationRepository.deleteByUserId(userId);
            log.debug("기존 캐시 삭제 완료: userId={}", userId);

            // 2. 새 캐시 저장
            List<?> jobs = (List<?>) recommendations.get("jobs");
            List<?> majors = (List<?>) recommendations.get("majors");
            List<String> jobExplanations = asStringList(recommendations.get("jobExplanations"));
            List<String> majorExplanations = asStringList(recommendations.get("majorExplanations"));

            if (jobs != null) {
                saveJobRecommendations(userId, jobs, jobExplanations);
            }
            if (majors != null) {
                saveMajorRecommendations(userId, majors, majorExplanations);
            }

            log.info("✅ 캐시 저장 완료: userId={}, jobs={}, majors={}",
                    userId, jobs != null ? jobs.size() : 0, majors != null ? majors.size() : 0);
        } catch (Exception e) {
            log.error("캐시 저장 실패: userId={}", userId, e);
        }
    }

    /**
     * 캐시를 무효화합니다 (프로필 변경 시 호출).
     */
    @Transactional
    public void invalidateCache(Long userId) {
        if (userId == null) {
            return;
        }

        jobRecommendationRepository.deleteByUserId(userId);
        majorRecommendationRepository.deleteByUserId(userId);
        log.info("캐시 무효화 완료: userId={}", userId);
    }

    /**
     * 모든 사용자의 캐시를 무효화합니다 (Option 3 - 전체 삭제).
     */
    @Transactional
    public void invalidateAllCache() {
        long jobCount = jobRecommendationRepository.count();
        long majorCount = majorRecommendationRepository.count();

        jobRecommendationRepository.deleteAll();
        majorRecommendationRepository.deleteAll();

        log.warn("🗑️  전체 캐시 무효화 완료: jobs={}, majors={}", jobCount, majorCount);
    }

    // ========== Private Helper Methods ==========

    private void saveJobRecommendations(Long userId, List<?> jobs, List<String> explanations) {
        for (int i = 0; i < jobs.size(); i++) {
            if (jobs.get(i) instanceof Map<?, ?> jobMap) {
                String explanation = i < explanations.size() ? explanations.get(i) : "";
                saveJobRecommendation(userId, asMap(jobMap), explanation);
            }
        }
    }

    private void saveMajorRecommendations(Long userId, List<?> majors, List<String> explanations) {
        for (int i = 0; i < majors.size(); i++) {
            if (majors.get(i) instanceof Map<?, ?> majorMap) {
                String explanation = i < explanations.size() ? explanations.get(i) : "";
                saveMajorRecommendation(userId, asMap(majorMap), explanation);
            }
        }
    }

    private void saveJobRecommendation(Long userId, Map<String, Object> jobMap, String explanation) {
        try {
            Map<String, Object> metadata = asMap(jobMap.get("metadata"));
            String jobName = getStringValue(jobMap, "jobName", getStringValue(jobMap, "title"));
            if (jobName == null || jobName.isBlank()) {
                log.warn("직업 추천 이름 누락으로 스킵: userId={}, job={}", userId, jobMap);
                return;
            }

            JobRecommendation recommendation = JobRecommendation.builder()
                    .userId(userId)
                    .jobCode(getStringValue(metadata, "job_code"))
                    .jobName(jobName)
                    .matchScore(getDoubleValue(jobMap, "match", getDoubleValue(jobMap, "score")))
                    .category(getStringValue(jobMap, "tag", getStringValue(jobMap, "category")))
                    .description(getStringValue(metadata, "description"))
                    .metadata(objectMapper.writeValueAsString(jobMap))
                    .explanation(explanation)
                    .build();

            jobRecommendationRepository.save(recommendation);
        } catch (Exception e) {
            log.error("직업 추천 저장 실패: userId={}, job={}", userId, jobMap, e);
        }
    }

    private void saveMajorRecommendation(Long userId, Map<String, Object> majorMap, String explanation) {
        try {
            Map<String, Object> metadata = asMap(majorMap.get("metadata"));
            String majorName = getStringValue(majorMap, "name",
                    getStringValue(majorMap, "title", getStringValue(majorMap, "majorName")));
            if (majorName == null || majorName.isBlank()) {
                log.warn("학과 추천 이름 누락으로 스킵: userId={}, major={}", userId, majorMap);
                return;
            }

            MajorRecommendation recommendation = MajorRecommendation.builder()
                    .userId(userId)
                    .majorCode(getStringValue(metadata, "major_code"))
                    .majorName(majorName)
                    .matchScore(getDoubleValue(majorMap, "match", getDoubleValue(majorMap, "score")))
                    .category(getStringValue(majorMap, "tag", getStringValue(majorMap, "category")))
                    .description(getStringValue(metadata, "description"))
                    .metadata(objectMapper.writeValueAsString(majorMap))
                    .explanation(explanation)
                    .build();

            majorRecommendationRepository.save(recommendation);
        } catch (Exception e) {
            log.error("학과 추천 저장 실패: userId={}, major={}", userId, majorMap, e);
        }
    }

    private List<Map<String, Object>> convertJobsToMap(List<JobRecommendation> jobs) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (JobRecommendation job : jobs) {
            try {
                Map<String, Object> jobMap = objectMapper.readValue(job.getMetadata(), Map.class);

                // DB에 저장된 matchScore를 우선 사용 (Option 1)
                if (job.getMatchScore() != null) {
                    jobMap.put("matchScore", job.getMatchScore());
                    jobMap.put("match", job.getMatchScore().intValue());
                    jobMap.put("score", job.getMatchScore() / 100.0); // 0-1 범위로도 제공
                }

                result.add(jobMap);
            } catch (JsonProcessingException e) {
                log.warn("직업 메타데이터 파싱 실패: jobId={}", job.getId(), e);
            }
        }
        return result;
    }

    private List<Map<String, Object>> convertMajorsToMap(List<MajorRecommendation> majors) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (MajorRecommendation major : majors) {
            try {
                Map<String, Object> majorMap = objectMapper.readValue(major.getMetadata(), Map.class);

                // DB에 저장된 matchScore를 우선 사용 (Option 1)
                if (major.getMatchScore() != null) {
                    majorMap.put("matchScore", major.getMatchScore());
                    majorMap.put("match", major.getMatchScore().intValue());
                    majorMap.put("score", major.getMatchScore() / 100.0); // 0-1 범위로도 제공
                }

                result.add(majorMap);
            } catch (JsonProcessingException e) {
                log.warn("학과 메타데이터 파싱 실패: majorId={}", major.getId(), e);
            }
        }
        return result;
    }

    private List<String> extractJobExplanations(List<JobRecommendation> jobs) {
        return jobs.stream()
                .map(JobRecommendation::getExplanation)
                .filter(Objects::nonNull)
                .toList();
    }

    private List<String> extractMajorExplanations(List<MajorRecommendation> majors) {
        return majors.stream()
                .map(MajorRecommendation::getExplanation)
                .filter(Objects::nonNull)
                .toList();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return new HashMap<>();
    }

    private List<String> asStringList(Object value) {
        if (value instanceof List<?> list) {
            return list.stream()
                    .filter(Objects::nonNull)
                    .map(Object::toString)
                    .toList();
        }
        return new ArrayList<>();
    }

    private String getStringValue(Map<String, Object> map, String key) {
        if (map == null)
            return null;
        Object value = map.get(key);
        return value != null ? String.valueOf(value) : null;
    }

    private String getStringValue(Map<String, Object> map, String key, String defaultValue) {
        String value = getStringValue(map, key);
        return value != null ? value : defaultValue;
    }

    private Double getDoubleValue(Map<String, Object> map, String key) {
        if (map == null)
            return 0.0;
        Object value = map.get(key);

        // Number 타입 처리
        if (value instanceof Number number) {
            return number.doubleValue();
        }

        // 문자열 파싱 추가 (Option 2)
        if (value instanceof String str) {
            try {
                return Double.parseDouble(str.trim());
            } catch (NumberFormatException e) {
                log.warn("숫자 파싱 실패: key={}, value={}", key, str);
            }
        }

        return 0.0;
    }

    private Double getDoubleValue(Map<String, Object> map, String key, Double defaultValue) {
        Double value = getDoubleValue(map, key);
        return value != 0.0 ? value : defaultValue;
    }
}
