package com.dreampath.service;

import com.dreampath.dto.ProfileRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.dreampath.entity.ProfileAnalysis;
import com.dreampath.entity.ProfileHistory;
import com.dreampath.entity.User;
import com.dreampath.entity.UserProfile;
import com.dreampath.repository.ProfileAnalysisRepository;
import com.dreampath.repository.ProfileHistoryRepository;
import com.dreampath.repository.UserProfileRepository;
import com.dreampath.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository repo;
    private final UserRepository userRepo;
    private final ProfileAnalysisService analysisService; // 🔥 추가됨
    private final ProfileAnalysisRepository analysisRepository;
    private final ProfileHistoryRepository historyRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 프로필 생성 + 분석 자동 생성
     */
    public UserProfile createProfile(ProfileRequest req) {

        User user = userRepo.findById(req.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Optional<UserProfile> existing = repo.findByUser_UserId(req.getUserId());
        if (existing.isPresent()) {
            throw new DuplicateKeyException("이미 해당 사용자의 프로필이 존재합니다.");
        }

        UserProfile profile = UserProfile.builder()
                .user(user)
                .personalityTraits(req.getPersonalityTraits())
                .values(req.getValues())
                .emotions(req.getEmotions())
                .interests(req.getInterests())
                .confidenceScore(req.getConfidenceScore())
                .lastAnalyzedAt(LocalDateTime.now())
                .build();

        UserProfile saved = repo.save(profile);

        // 🔥 프로필 생성 후 분석 자동 생성
        ProfileAnalysis analysis = analysisService.generateAnalysis(saved);

        return saved;
    }

    /**
     * 프로필 조회
     */
    public UserProfile getProfile(Long userId) {
        return repo.findByUser_UserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));
    }

    /**
     * 전체 수정 + 분석 자동 재생성
     */
    public UserProfile updateProfile(Long id, ProfileRequest req) {
        UserProfile p = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        validateRequired(req);

        String beforeData = toJsonString(p);

        p.setPersonalityTraits(req.getPersonalityTraits());
        p.setValues(req.getValues());
        p.setEmotions(req.getEmotions());
        p.setInterests(req.getInterests());
        p.setConfidenceScore(req.getConfidenceScore());
        p.setLastAnalyzedAt(LocalDateTime.now());

        UserProfile saved = repo.save(p);

        // 🔥 프로필 전체 수정 후 분석 재생성
        analysisService.generateAnalysis(saved);

        saveHistory(saved.getProfileId(), "UPDATE", beforeData, toJsonString(saved));

        return saved;
    }

    /**
     * 부분 수정 + 분석 자동 재생성
     */
    public UserProfile partialUpdate(Long id, Map<String, Object> fields) {
        UserProfile p = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        if (fields.containsKey("personalityTraits")) {
            p.setPersonalityTraits((String) fields.get("personalityTraits"));
        }
        if (fields.containsKey("values")) {
            p.setValues((String) fields.get("values"));
        }
        if (fields.containsKey("interests")) {
            p.setInterests((String) fields.get("interests"));
        }
        if (fields.containsKey("emotions")) {
            p.setEmotions((String) fields.get("emotions"));
        }
        if (fields.containsKey("confidenceScore")) {
            Object value = fields.get("confidenceScore");
            if (value instanceof Number) {
                p.setConfidenceScore(((Number) value).doubleValue());
            }
        }

        p.setLastAnalyzedAt(LocalDateTime.now());
        UserProfile saved = repo.save(p);

        // 🔥 부분 수정 후 분석 자동 재생성
        analysisService.generateAnalysis(saved);

        return saved;
    }

    /**
     * 프로필 삭제 + 관련 분석 삭제
     */
    public void deleteProfile(Long id) {
        UserProfile profile = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        String beforeData = toJsonString(profile);

        repo.deleteById(id);
        analysisRepository.deleteByUserId(profile.getUser().getUserId());

        saveHistory(id, "DELETE", beforeData, null);
    }

    private void saveHistory(Long profileId, String changeType, String beforeData, String afterData) {
        ProfileHistory history = ProfileHistory.builder()
                .profileId(profileId)
                .changeType(changeType)
                .beforeData(beforeData)
                .afterData(afterData)
                .build();
        historyRepository.save(history);
    }

    private String toJsonString(UserProfile profile) {
        if (profile == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(profile);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    /**
     * 필수 입력값 검증
     */
    private void validateRequired(ProfileRequest req) {
        if (isBlank(req.getPersonalityTraits()))
            throw new IllegalArgumentException("성격 특성은 필수 입력입니다.");
        if (isBlank(req.getValues()))
            throw new IllegalArgumentException("가치관은 필수 입력입니다.");
        if (isBlank(req.getInterests()))
            throw new IllegalArgumentException("관심 분야는 필수 입력입니다.");
        if (isBlank(req.getEmotions()))
            throw new IllegalArgumentException("감정 패턴은 필수 입력입니다.");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
