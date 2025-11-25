package com.dreampath.scripts;

import com.dreampath.entity.chatbot.Faq;
import com.dreampath.repository.chatbot.FaqRepository;
import com.dreampath.service.rag.RagEmbeddingService;
import okhttp3.*;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.List;

/**
 * FAQ 데이터를 Pinecone에 업로드하는 스크립트
 *
 * 실행 방법:
 * IDE에서 이 클래스의 main 메서드를 직접 실행하세요.
 * (일반 백엔드 서버 실행과는 별도로 실행됩니다)
 */
public class FaqUploadScript {

    public static void main(String[] args) throws Exception {
        System.setProperty("spring.main.web-application-type", "none");

        ConfigurableApplicationContext context =
            SpringApplication.run(com.dreampath.DreamPathApplication.class, args);

        FaqRepository faqRepository = context.getBean(FaqRepository.class);
        RagEmbeddingService embeddingService = context.getBean(RagEmbeddingService.class);

        String pineconeApiKey = context.getEnvironment().getProperty("pinecone.api.key");
        String pineconeHost = context.getEnvironment().getProperty("pinecone.host");

        new FaqUploadScript().execute(faqRepository, embeddingService, pineconeApiKey, pineconeHost);

        System.exit(0);
    }

    public void execute(FaqRepository faqRepository, RagEmbeddingService embeddingService,
                        String pineconeApiKey, String pineconeHost) throws Exception {
        System.out.println("📌 FAQ 불러오는 중...");

        // 1. Supabase에서 모든 FAQ 조회
        List<Faq> faqList = faqRepository.findAll();

        if (faqList.isEmpty()) {
            System.out.println("⚠️ FAQ 데이터가 없습니다.");
            return;
        }

        System.out.println("📌 총 " + faqList.size() + "개의 FAQ 찾음. 임베딩 생성 중...");

        // 2. 각 FAQ를 임베딩하고 Pinecone에 업로드할 벡터 배열 생성
        JSONArray vectors = new JSONArray();

        for (Faq faq : faqList) {
            String id = String.valueOf(faq.getId());
            String text = faq.getCategory() + "\n" + faq.getQuestion() + "\n" + faq.getAnswer();

            // 임베딩 생성
            float[] embedding = embeddingService.embed(text);

            // 벡터 객체 생성
            JSONObject vector = new JSONObject();
            vector.put("id", id);
            vector.put("values", embedding);

            JSONObject metadata = new JSONObject();
            metadata.put("category", faq.getCategory());
            metadata.put("question", faq.getQuestion());
            metadata.put("answer", faq.getAnswer());

            vector.put("metadata", metadata);
            vectors.put(vector);

            System.out.println("✅ FAQ #" + id + " 임베딩 완료");
        }

        // 3. Pinecone에 업로드
        System.out.println("📌 Pinecone 업서트 중...");
        uploadToPinecone(vectors, pineconeApiKey, pineconeHost);

        System.out.println("🎉 Pinecone 업서트 완료!");
    }

    private void uploadToPinecone(JSONArray vectors, String pineconeApiKey, String pineconeHost) throws Exception {
        OkHttpClient client = new OkHttpClient();
        JSONObject json = new JSONObject();
        json.put("vectors", vectors);

        RequestBody body = RequestBody.create(
                json.toString(),
                MediaType.parse("application/json")
        );

        Request request = new Request.Builder()
                .url("https://" + pineconeHost + "/vectors/upsert")
                .addHeader("Api-Key", pineconeApiKey)
                .post(body)
                .build();

        Response response = client.newCall(request).execute();

        if (!response.isSuccessful()) {
            throw new RuntimeException("Pinecone 업로드 실패: " + response.body().string());
        }

        System.out.println("✅ Pinecone 응답: " + response.body().string());
    }
}
