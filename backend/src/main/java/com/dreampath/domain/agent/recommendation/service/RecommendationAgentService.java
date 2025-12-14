package com.dreampath.domain.agent.recommendation.service;

import com.dreampath.domain.agent.recommendation.dto.RecommendationAgentRequest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class RecommendationAgentService {

    private static final ParameterizedTypeReference<Map<String, Object>> RESPONSE_TYPE = new ParameterizedTypeReference<>() {
    };

    private final WebClient webClient;

    public RecommendationAgentService(
            WebClient.Builder webClientBuilder,
            @Value("${python.ai.service.url:http://localhost:8000}") String aiServiceBaseUrl) {
        this.webClient = webClientBuilder
                .baseUrl(aiServiceBaseUrl)
                .build();
    }

    public Mono<Map<String, Object>> runRecommendation(RecommendationAgentRequest payload) {
        return webClient.post()
                .uri("/api/agent/recommendation")
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(RESPONSE_TYPE)
                .map(this::mergeExplanations);
    }

    private Map<String, Object> mergeExplanations(Map<String, Object> response) {
        log.info(">>>> [DEBUG] AI Response Raw Keys: {}", response.keySet());

        Object jobsObj = response.get("jobs");
        if (jobsObj != null) {
            log.info(">>>> [DEBUG] 'jobs' type: {}, content: {}", jobsObj.getClass().getName(), jobsObj);
        } else {
            log.warn(">>>> [DEBUG] 'jobs' key is NULL or Missing");
        }

        List<Map<String, Object>> jobs = asMapList(response.get("jobs"));
        List<Map<String, Object>> majors = asMapList(response.get("majors"));

        // 1. Try to get from "explanations" object (Original structure)
        Map<String, Object> explanationBlock = asMap(response.get("explanations"));
        List<String> jobExplanations = new ArrayList<>();
        List<String> majorExplanations = new ArrayList<>();

        if (explanationBlock != null) {
            jobExplanations = asStringList(explanationBlock.get("jobs"));
            majorExplanations = asStringList(explanationBlock.get("majors"));
        }

        // 2. If empty, try to get from top-level keys (New Agent/Fallback structure)
        if (jobExplanations.isEmpty()) {
            jobExplanations = asStringList(response.get("jobExplanations"));
        }
        if (majorExplanations.isEmpty()) {
            majorExplanations = asStringList(response.get("majorExplanations"));
        }

        attachReasons(jobs, jobExplanations);
        attachReasons(majors, majorExplanations);

        Map<String, Object> explanations = new HashMap<>();
        explanations.put("jobs", jobExplanations);
        explanations.put("majors", majorExplanations);

        Map<String, Object> payload = new HashMap<>();
        payload.put("jobs", jobs);
        payload.put("majors", majors);
        payload.put("explanations", explanations);
        payload.put("jobExplanations", jobExplanations);
        payload.put("majorExplanations", majorExplanations);
        return payload;
    }

    private void attachReasons(List<Map<String, Object>> items, List<String> reasons) {
        int limit = Math.min(items.size(), reasons.size());
        for (int i = 0; i < limit; i++) {
            Map<String, Object> item = items.get(i);
            if (item != null) {
                item.put("reason", reasons.get(i));
            }
        }
    }

    private List<Map<String, Object>> asMapList(Object value) {
        if (!(value instanceof List<?> list)) {
            return new ArrayList<>();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object entry : list) {
            if (entry instanceof Map<?, ?> map) {
                result.add(asMap(map));
            }
        }
        return result;
    }

    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> normalized = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getKey() != null) {
                    normalized.put(entry.getKey().toString(), entry.getValue());
                }
            }
            return normalized;
        }
        return null;
    }

    private List<String> asStringList(Object value) {
        if (!(value instanceof List<?> list)) {
            return new ArrayList<>();
        }
        List<String> result = new ArrayList<>();
        for (Object entry : list) {
            if (entry != null) {
                result.add(entry.toString());
            }
        }
        return result;
    }
}
