package com.dreampath.domain.profile.service;

import com.dreampath.domain.profile.entity.ProfileAnalysis;
import com.dreampath.domain.profile.repository.ProfileAnalysisRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class ProfileAnalysisService {

    private final ProfileAnalysisRepository analysisRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ProfileAnalysis findByUserId(Long userId) {
        return analysisRepository.findByUserId(userId).orElse(null);
    }

    /**
     * 프로필 기반 분석 생성 (임시 버전)
     * 추후 벡터/RAG로 교체 예정
     */
    public ProfileAnalysis generateAnalysis(ProfileDocument profile) {
        if (profile == null) {
            throw new IllegalArgumentException("ProfileDocument가 필요합니다.");
        }

        // 1. 해시 계산
        String currentHash = calculateHash(profile);

        // 2. 기존 분석 조회
        ProfileAnalysis analysis = analysisRepository.findByUserId(profile.userId())
                .orElseGet(() -> ProfileAnalysis.builder()
                        .userId(profile.userId())
                        .build());

        // 3. 해시가 같으면 재계산 건너뜀 (기존 데이터 반환)
        if (currentHash != null && currentHash.equals(analysis.getContentHash())) {
            return analysis;
        }

        // 4. 변경되었으면 새로 생성 (기존 로직)
        Random r = new Random();

        String personalityJson = """
                {
                    "openness": %.2f,
                    "stability": %.2f,
                    "extraversion": %.2f,
                    "agreeableness": %.2f,
                    "conscientiousness": %.2f
                }
                """.formatted(
                r.nextDouble(), r.nextDouble(), r.nextDouble(),
                r.nextDouble(), r.nextDouble());

        String valuesJson = """
                {
                    "creativity": %.2f,
                    "growth": %.2f,
                    "security": %.2f
                }
                """.formatted(
                r.nextDouble(), r.nextDouble(), r.nextDouble());

        String emotionJson = """
                {
                    "summary": "목표 지향적이고 안정적인 성향을 보이는 사용자입니다."
                }
                """;

        analysis.setPersonality(personalityJson);
        analysis.setValues(valuesJson);
        analysis.setEmotions(emotionJson);
        analysis.setInterests(ensureJson(profile.interests()));
        analysis.setConfidenceScore(r.nextDouble());
        analysis.setMbti(generateMbti(personalityJson));

        // 5. 새 해시 저장
        analysis.setContentHash(currentHash);

        return analysisRepository.save(analysis);
    }

    private String calculateHash(ProfileDocument profile) {
        try {
            String content = String.join("|",
                    String.valueOf(profile.personalityTraits()),
                    String.valueOf(profile.values()),
                    String.valueOf(profile.interests()),
                    String.valueOf(profile.emotions()));
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1)
                    hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            return null;
        }
    }

    private String ensureJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            objectMapper.readTree(raw);
            return raw;
        } catch (JsonProcessingException ignored) {
            try {
                return objectMapper.writeValueAsString(raw);
            } catch (JsonProcessingException e) {
                return null;
            }
        }
    }

    private String generateMbti(String personalityJson) {
        if (personalityJson == null) {
            return null;
        }
        try {
            var node = objectMapper.readTree(personalityJson);
            double openness = node.path("openness").asDouble(0.5);
            double stability = node.path("stability").asDouble(0.5);
            double extraversion = node.path("extraversion").asDouble(0.5);
            double agreeableness = node.path("agreeableness").asDouble(0.5);
            double conscientiousness = node.path("conscientiousness").asDouble(0.5);

            char eOrI = extraversion >= 0.5 ? 'E' : 'I';
            char sOrN = openness >= 0.5 ? 'N' : 'S';
            char tOrF = agreeableness >= 0.5 ? 'F' : 'T';
            char jOrP = conscientiousness >= 0.5 ? 'J' : 'P';

            return new String(new char[] { eOrI, sOrN, tOrF, jOrP });
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    /**
     * 성향 분석을 생성할 때 필요한 최소 데이터 묶음.
     */
    public record ProfileDocument(
            Long userId,
            String personalityTraits,
            String values,
            String interests,
            String emotions
    ) {
        public ProfileDocument {
            if (userId == null) {
                throw new IllegalArgumentException("userId는 필수입니다.");
            }
        }
    }
}
