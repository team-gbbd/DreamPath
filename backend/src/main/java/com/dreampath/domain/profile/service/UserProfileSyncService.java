package com.dreampath.domain.profile.service;

import com.dreampath.domain.profile.entity.ProfileAnalysis;
import com.dreampath.domain.profile.entity.UserProfile;
import com.dreampath.domain.profile.repository.UserProfileRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * UserProfile 자동 동기화 서비스
 * 
 * ProfileAnalysis가 저장될 때 자동으로 UserProfile을 업데이트하고
 * 벡터를 재생성하여 추천 시스템이 최신 분석 결과를 반영하도록 합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserProfileSyncService {

    private final UserProfileRepository userProfileRepository;
    private final ProfileVectorService vectorService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * ProfileAnalysis 데이터를 UserProfile에 동기화하고 벡터 재생성
     * 
     * @param userId   사용자 ID
     * @param analysis 성향 분석 결과
     * @return 업데이트된 UserProfile
     */
    @Transactional
    public UserProfile syncFromAnalysis(Long userId, ProfileAnalysis analysis) {
        log.info("🔄 Starting UserProfile sync for userId: {}", userId);

        // 1. 기존 UserProfile 조회 또는 새로 생성
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    log.info("✨ Creating new UserProfile for userId: {}", userId);
                    return UserProfile.builder()
                            .userId(userId)
                            .build();
                });

        // 2. ProfileAnalysis 데이터를 UserProfile에 매핑
        profile.setPersonality(extractTextFromJson(analysis.getPersonality()));
        profile.setValues(extractTextFromJson(analysis.getValues()));
        profile.setEmotions(extractTextFromJson(analysis.getEmotions()));
        profile.setInterests(extractTextFromJson(analysis.getInterests()));

        // 🔄 강제 업데이트: 내용 변경이 없어도 타임스탬프를 갱신하여 추천 캐시 무효화
        profile.setUpdatedAt(java.time.LocalDateTime.now());

        // 3. UserProfile 저장
        UserProfile savedProfile = userProfileRepository.save(profile);
        log.info("✅ UserProfile saved: profileId={}", savedProfile.getProfileId());

        // 4. 벡터 자동 재생성
        try {
            String document = savedProfile.toDocument();
            log.info("📄 Generated document for vector embedding (length: {})", document.length());

            vectorService.generateVector(savedProfile.getProfileId(), document);
            log.info("🔮 Vector regenerated successfully for profileId: {}", savedProfile.getProfileId());
        } catch (Exception e) {
            log.error("❌ Vector regeneration failed for profileId: {}", savedProfile.getProfileId(), e);
            // 벡터 생성 실패해도 UserProfile 저장은 유지 (부분 성공)
        }

        return savedProfile;
    }

    /**
     * JSON 문자열에서 텍스트 추출
     * JSON이 아닌 경우 그대로 반환
     */
    private String extractTextFromJson(String jsonOrText) {
        if (jsonOrText == null || jsonOrText.isBlank()) {
            return null;
        }

        String trimmed = jsonOrText.trim();
        if (looksLikeJson(trimmed)) {
            try {
                JsonNode node = objectMapper.readTree(trimmed);
                if (node.hasNonNull("summary")) {
                    return node.get("summary").asText();
                }
                if (node.hasNonNull("description")) {
                    return node.get("description").asText();
                }
                if (node.isArray()) {
                    List<String> texts = new ArrayList<>();
                    node.forEach(item -> {
                        if (item.isTextual()) {
                            texts.add(item.asText());
                        } else if (item.has("name")) {
                            texts.add(item.get("name").asText());
                        } else if (item.has("description")) {
                            texts.add(item.get("description").asText());
                        }
                    });
                    if (!texts.isEmpty()) {
                        return String.join(", ", texts);
                    }
                }
            } catch (JsonProcessingException e) {
                log.debug("JSON parsing failed while extracting profile text", e);
            }
        }

        return trimmed;
    }

    private boolean looksLikeJson(String value) {
        if (value == null) {
            return false;
        }
        String normalized = value.trim();
        return (normalized.startsWith("{") && normalized.endsWith("}"))
                || (normalized.startsWith("[") && normalized.endsWith("]"));
    }
}
