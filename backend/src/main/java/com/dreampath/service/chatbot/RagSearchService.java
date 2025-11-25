package com.dreampath.service.chatbot;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import okhttp3.*;
import org.json.JSONArray;
import org.json.JSONObject;

@Service
@RequiredArgsConstructor
public class RagSearchService {

    @Value("${pinecone.api.key}")
    private String pineconeApiKey;

    @Value("${pinecone.index}")
    private String pineconeIndex;

    @Value("${pinecone.host}")
    private String pineconeHost;

    private final OkHttpClient client = new OkHttpClient();

    public JSONArray search(float[] vector) {
        // Pinecone이 설정되지 않았으면 빈 배열 반환
        if ("dummykey".equals(pineconeApiKey) || "dummy-host.pinecone.io".equals(pineconeHost)) {
            return new JSONArray();
        }

        try {
            JSONObject json = new JSONObject();
            json.put("vector", vector);
            json.put("topK", 5);
            json.put("includeMetadata", true);

            RequestBody body = RequestBody.create(
                    json.toString(),
                    MediaType.parse("application/json")
            );

            Request request = new Request.Builder()
                    .url("https://" + pineconeHost + "/query")
                    .addHeader("Api-Key", pineconeApiKey)
                    .post(body)
                    .build();

            Response response = client.newCall(request).execute();
            String responseBody = response.body().string();

            JSONObject obj = new JSONObject(responseBody);
            return obj.getJSONArray("matches");

        } catch (Exception e) {
            // Pinecone 검색 실패 시 빈 배열 반환 (서비스는 계속 동작)
            return new JSONArray();
        }
    }
}
