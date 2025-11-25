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

    @Value("${python.recommend.base-url:http://python-ai-service:8000}")
    private String recommendBaseUrl;

    public List<?> recommendWorknet(String vectorId) {
        return postForItems("/recommend/worknet", vectorId);
    }

    public List<?> recommendMajor(String vectorId) {
        return postForItems("/recommend/majors", vectorId);
    }

    public List<?> recommendSchool(String vectorId) {
        return postForItems("/recommend/schools", vectorId);
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
