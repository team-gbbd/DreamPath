package com.dreampath.service.chatbot;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class EmbeddingService {

    @Value("${openai.api.key}")
    private String apiKey;

    private final WebClient webClient = WebClient.create();

    public float[] createEmbedding(String text) {

        JsonNode response = webClient.post()
                .uri("https://api.openai.com/v1/embeddings")
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .bodyValue("""
                        {
                          "model": "text-embedding-3-small",
                          "input": "%s"
                        }
                        """.formatted(text))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        JsonNode embedding = response.get("data").get(0).get("embedding");

        float[] vector = new float[embedding.size()];
        for (int i = 0; i < embedding.size(); i++) {
            vector[i] = embedding.get(i).floatValue();
        }

        return vector;
    }
}
