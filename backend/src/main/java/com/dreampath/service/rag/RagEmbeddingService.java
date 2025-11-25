package com.dreampath.service.rag;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import okhttp3.*;
import org.json.JSONArray;
import org.json.JSONObject;

@Service
@RequiredArgsConstructor
public class RagEmbeddingService {

    @Value("${openai.api.key}")
    private String openaiApiKey;

    private final OkHttpClient client = new OkHttpClient();

    public float[] embed(String text) {

        try {
            JSONObject json = new JSONObject();
            json.put("model", "text-embedding-3-small");
            json.put("input", text);

            RequestBody body = RequestBody.create(
                    json.toString(),
                    MediaType.parse("application/json")
            );

            Request request = new Request.Builder()
                    .url("https://api.openai.com/v1/embeddings")
                    .addHeader("Authorization", "Bearer " + openaiApiKey)
                    .post(body)
                    .build();

            Response response = client.newCall(request).execute();
            String responseBody = response.body().string();

            JSONObject obj = new JSONObject(responseBody);
            var arr = obj.getJSONArray("data")
                    .getJSONObject(0)
                    .getJSONArray("embedding");

            float[] vector = new float[arr.length()];
            for (int i = 0; i < arr.length(); i++) {
                vector[i] = (float) arr.getDouble(i);
            }

            return vector;

        } catch (Exception e) {
            throw new RuntimeException("임베딩 생성 실패", e);
        }
    }
}
