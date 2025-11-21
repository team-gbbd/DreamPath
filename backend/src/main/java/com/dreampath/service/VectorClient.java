package com.dreampath.service;

import com.dreampath.dto.VectorAnalyzeRequest;
import com.dreampath.dto.VectorAnalyzeResponse;
import com.dreampath.util.RetryUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class VectorClient {

    private final RestTemplate restTemplate;

    @Value("${python.vector.service.url:http://localhost:8000/api/vectors/analyze}")
    private String vectorServiceUrl;

    public VectorAnalyzeResponse analyzeVector(Long profileId, String document) {
        return RetryUtil.retry(() -> {
            VectorAnalyzeRequest req = new VectorAnalyzeRequest();
            req.setUserId(profileId);
            req.setDocument(document);
            return restTemplate.postForObject(vectorServiceUrl, req, VectorAnalyzeResponse.class);
        }, 3);
    }
}
