package com.dreampath.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class PineconeService {

    @Value("${pinecone.api-key}")
    private String apiKey;

    @Value("${pinecone.index-host}")
    private String indexHost;

    private final WebClient webClient = WebClient.builder().build();

    public String queryFaq(float[] embedding) {

        Map<String, Object> body = Map.of(
                "vector", embedding,
                "topK", 3,
                "includeMetadata", true
        );

        return webClient.post()
                .uri(indexHost + "/query")
                .header("Api-Key", apiKey)
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();
    }
}
