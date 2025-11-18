package com.dreampath.service;

import com.dreampath.entity.*;
import com.dreampath.dto.ProfileRequest;
import com.dreampath.repository.UserProfileRepository;
import com.dreampath.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.lang.reflect.Field;
import org.springframework.util.ReflectionUtils;
import org.springframework.dao.DuplicateKeyException;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository repo;
    private final UserRepository userRepo;

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

        return repo.save(profile);
    }

    public UserProfile getProfile(Long userId) {
        return repo.findByUser_UserId(userId)
            .orElseThrow(() -> new IllegalArgumentException("Profile not found"));
    }

    public UserProfile updateProfile(Long id, ProfileRequest req) {
        UserProfile p = repo.findById(id).orElseThrow();

        if (req.getPersonalityTraits() == null || req.getPersonalityTraits().isBlank())
            throw new IllegalArgumentException("성격 특성은 필수 입력입니다.");
        if (req.getValues() == null || req.getValues().isBlank())
            throw new IllegalArgumentException("가치관은 필수 입력입니다.");
        if (req.getInterests() == null || req.getInterests().isBlank())
            throw new IllegalArgumentException("관심 분야는 필수 입력입니다.");
        if (req.getEmotions() == null || req.getEmotions().isBlank())
            throw new IllegalArgumentException("감정 패턴은 필수 입력입니다.");

        p.setPersonalityTraits(req.getPersonalityTraits());
        p.setValues(req.getValues());
        p.setEmotions(req.getEmotions());
        p.setInterests(req.getInterests());
        p.setConfidenceScore(req.getConfidenceScore());
        p.setLastAnalyzedAt(LocalDateTime.now());

        return repo.save(p);
    }

    public UserProfile partialUpdate(Long id, Map<String, Object> fields) {
        UserProfile p = repo.findById(id).orElseThrow();

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

        return repo.save(p);
    }
}
