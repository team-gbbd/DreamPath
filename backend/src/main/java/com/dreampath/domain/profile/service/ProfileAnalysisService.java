package com.dreampath.domain.profile.service;

import com.dreampath.domain.profile.entity.ProfileAnalysis;
import com.dreampath.domain.profile.entity.UserProfile;
import com.dreampath.domain.profile.repository.ProfileAnalysisRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
    public ProfileAnalysis generateAnalysis(UserProfile profile) {

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
                r.nextDouble(), r.nextDouble()
        );

        String valuesJson = """
        {
            "creativity": %.2f,
            "growth": %.2f,
            "security": %.2f
        }
        """.formatted(
                r.nextDouble(), r.nextDouble(), r.nextDouble()
        );

        String emotionJson = """
        {
            "summary": "목표 지향적이고 안정적인 성향을 보이는 사용자입니다."
        }
        """;

        ProfileAnalysis analysis = analysisRepository.findByUserId(profile.getUser().getUserId())
                .orElseGet(() -> ProfileAnalysis.builder()
                        .userId(profile.getUser().getUserId())
                        .build());

        analysis.setPersonality(personalityJson);
        analysis.setValues(valuesJson);
        analysis.setEmotions(emotionJson);
        analysis.setInterests(ensureJson(profile.getInterests()));
        analysis.setConfidenceScore(r.nextDouble());
        analysis.setMbti(generateMbti(personalityJson));

        return analysisRepository.save(analysis);
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

            return new String(new char[]{eOrI, sOrN, tOrF, jOrP});
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
