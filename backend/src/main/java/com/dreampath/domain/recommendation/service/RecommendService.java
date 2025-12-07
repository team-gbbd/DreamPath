package com.dreampath.domain.recommendation.service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class RecommendService {

    private final RestTemplate restTemplate;

    @Value("${python.recommend.base-url:http://ai-service:8000}")
    private String recommendBaseUrl;

    public List<?> recommendCounsel(String vectorId) {
        return postForItems("/recommend/counsel", vectorId);
    }

    public List<?> recommendWorknet(String vectorId) {
        return postForItems("/recommend/worknet", vectorId);
    }

    public List<?> recommendMajor(String vectorId) {
        return postForItems("/recommend/majors", vectorId);
    }

    public List<?> recommendSchool(String vectorId) {
        return postForItems("/recommend/schools", vectorId);
    }

    public Map<String, Object> recommendHybridJob(String vectorId, int topK) {
        Map<String, Object> payload = Map.of(
                "vectorId", vectorId,
                "topK", topK);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = (Map<String, Object>) restTemplate.postForObject(
                    recommendBaseUrl + "/recommend/hybrid-jobs",
                    payload,
                    Map.class);

            if (response == null) {
                return Map.of("recommended", Collections.emptyList());
            }

            Object recommended = response.get("recommended");
            if (recommended == null) {
                return Map.of("recommended", Collections.emptyList());
            }

            return Map.of("recommended", recommended);
        } catch (Exception e) {
            return Map.of("recommended", Collections.emptyList(), "error", e.getMessage());
        }
    }

    private List<?> postForItems(String path, String vectorId) {
        Map<String, Object> payload = Map.of("vectorId", vectorId);
        Map<?, ?> response = restTemplate.postForObject(recommendBaseUrl + path, payload, Map.class);
        if (response == null) {
            return Collections.emptyList();
        }
        Object items = response.get("items");
        if (items instanceof List<?>) {
            return (List<?>) items;
        }
        return Collections.emptyList();
    }
}
