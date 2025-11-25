package com.dreampath.service.rag;

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

    @Value("${pinecone.host}")
    private String pineconeHost;

    private final OkHttpClient client = new OkHttpClient();

    public JSONArray search(float[] vector) {

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
            throw new RuntimeException("Pinecone 검색 실패", e);
        }
    }
}