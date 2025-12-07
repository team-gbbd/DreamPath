package com.dreampath.domain.chatbot.controller;

import com.dreampath.domain.chatbot.entity.Faq;
import com.dreampath.domain.chatbot.repository.FaqRepository;
import com.dreampath.domain.chatbot.service.RagEmbeddingService;
import lombok.RequiredArgsConstructor;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(value = "/api/faq", produces = "application/json;charset=UTF-8")
@RequiredArgsConstructor
public class FaqController {

    private final FaqRepository faqRepository;
    private final RagEmbeddingService embeddingService;

    @Value("${pinecone.faq.api.key}")
    private String pineconeApiKey;

    @Value("${pinecone.faq.host}")
    private String pineconeHost;

    @GetMapping("/all")
    public List<Faq> getAllFaq() {
        return faqRepository.findAll();
    }

    @GetMapping("/category")
    public List<Faq> getFaqByCategory(@RequestParam String name) {
        return faqRepository.findByCategory(name);
    }

    // ========== 관리자 CRUD API ==========

    private Faq createFaq(String category, String question, String answer) {
        Faq faq = new Faq();
        faq.setCategory(category);
        faq.setQuestion(question);
        faq.setAnswer(answer);
        faq.setUpdatedAt(LocalDateTime.now());
        return faq;
    }

    // ========== 관리자 CRUD API ==========

    /**
     * FAQ 생성
     */
    @PostMapping(consumes = "application/json;charset=UTF-8")
    public Map<String, Object> createFaq(@RequestBody Map<String, String> request) {
        try {
            String category = request.get("category");
            String question = request.get("question");
            String answer = request.get("answer");

            if (category == null || question == null || answer == null) {
                return Map.of(
                    "success", false,
                    "message", "카테고리, 질문, 답변은 필수 입력 항목입니다."
                );
            }

            Faq faq = createFaq(category, question, answer);
            Faq saved = faqRepository.save(faq);

            // Pinecone에 업로드
            try {
                uploadToPinecone(saved);
            } catch (Exception e) {
                System.err.println("Pinecone 업로드 실패: " + e.getMessage());
                // Pinecone 업로드 실패해도 DB 저장은 성공으로 처리
            }

            return Map.of(
                "success", true,
                "message", "FAQ가 성공적으로 생성되었습니다.",
                "data", saved
            );
        } catch (Exception e) {
            return Map.of(
                "success", false,
                "message", "FAQ 생성 중 오류가 발생했습니다: " + e.getMessage()
            );
        }
    }

    /**
     * FAQ 수정
     */
    @PutMapping(value = "/{id}", consumes = "application/json;charset=UTF-8")
    public Map<String, Object> updateFaq(@PathVariable Long id, @RequestBody Map<String, String> request) {
        try {
            Faq faq = faqRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("FAQ를 찾을 수 없습니다."));

            String category = request.get("category");
            String question = request.get("question");
            String answer = request.get("answer");

            if (category != null) faq.setCategory(category);
            if (question != null) faq.setQuestion(question);
            if (answer != null) faq.setAnswer(answer);
            faq.setUpdatedAt(LocalDateTime.now());

            Faq updated = faqRepository.save(faq);

            // Pinecone에 업데이트 (upsert)
            try {
                uploadToPinecone(updated);
            } catch (Exception e) {
                System.err.println("Pinecone 업데이트 실패: " + e.getMessage());
            }

            return Map.of(
                "success", true,
                "message", "FAQ가 성공적으로 수정되었습니다.",
                "data", updated
            );
        } catch (Exception e) {
            return Map.of(
                "success", false,
                "message", "FAQ 수정 중 오류가 발생했습니다: " + e.getMessage()
            );
        }
    }

    /**
     * FAQ 삭제
     */
    @DeleteMapping("/{id}")
    public Map<String, Object> deleteFaq(@PathVariable Long id) {
        try {
            if (!faqRepository.existsById(id)) {
                return Map.of(
                    "success", false,
                    "message", "FAQ를 찾을 수 없습니다."
                );
            }

            faqRepository.deleteById(id);

            // Pinecone에서 삭제
            try {
                deleteFromPinecone(id);
            } catch (Exception e) {
                System.err.println("Pinecone 삭제 실패: " + e.getMessage());
            }

            return Map.of(
                "success", true,
                "message", "FAQ가 성공적으로 삭제되었습니다."
            );
        } catch (Exception e) {
            return Map.of(
                "success", false,
                "message", "FAQ 삭제 중 오류가 발생했습니다: " + e.getMessage()
            );
        }
    }

    /**
     * 단일 FAQ 조회
     */
    @GetMapping("/{id}")
    public Map<String, Object> getFaqById(@PathVariable Long id) {
        try {
            Faq faq = faqRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("FAQ를 찾을 수 없습니다."));

            return Map.of(
                "success", true,
                "data", faq
            );
        } catch (Exception e) {
            return Map.of(
                "success", false,
                "message", "FAQ 조회 중 오류가 발생했습니다: " + e.getMessage()
            );
        }
    }

    /**
     * 모든 FAQ를 Pinecone에 동기화
     */
    @PostMapping("/sync-pinecone")
    public Map<String, Object> syncToPinecone() {
        try {
            List<Faq> allFaqs = faqRepository.findAll();

            if (allFaqs.isEmpty()) {
                return Map.of(
                    "success", false,
                    "message", "동기화할 FAQ가 없습니다."
                );
            }

            int successCount = 0;
            int failCount = 0;

            for (Faq faq : allFaqs) {
                try {
                    uploadToPinecone(faq);
                    successCount++;
                } catch (Exception e) {
                    System.err.println("FAQ #" + faq.getId() + " 동기화 실패: " + e.getMessage());
                    failCount++;
                }
            }

            return Map.of(
                "success", true,
                "message", "Pinecone 동기화 완료",
                "total", allFaqs.size(),
                "successCount", successCount,
                "failedCount", failCount
            );
        } catch (Exception e) {
            return Map.of(
                "success", false,
                "message", "Pinecone 동기화 중 오류가 발생했습니다: " + e.getMessage()
            );
        }
    }

    // ========== Pinecone 연동 헬퍼 메서드 ==========

    /**
     * FAQ를 Pinecone에 업로드/업데이트
     */
    private void uploadToPinecone(Faq faq) throws Exception {
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

        JSONArray vectors = new JSONArray();
        vectors.put(vector);

        // Pinecone에 업서트
        JSONObject json = new JSONObject();
        json.put("vectors", vectors);

        OkHttpClient client = new OkHttpClient();
        okhttp3.RequestBody body = okhttp3.RequestBody.create(
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

        System.out.println("✅ FAQ #" + id + " Pinecone 업로드 완료");
    }

    /**
     * FAQ를 Pinecone에서 삭제
     */
    private void deleteFromPinecone(Long faqId) throws Exception {
        String id = String.valueOf(faqId);

        JSONArray ids = new JSONArray();
        ids.put(id);

        JSONObject json = new JSONObject();
        json.put("ids", ids);

        OkHttpClient client = new OkHttpClient();
        okhttp3.RequestBody body = okhttp3.RequestBody.create(
            json.toString(),
            MediaType.parse("application/json")
        );

        Request request = new Request.Builder()
            .url("https://" + pineconeHost + "/vectors/delete")
            .addHeader("Api-Key", pineconeApiKey)
            .post(body)
            .build();

        Response response = client.newCall(request).execute();
        if (!response.isSuccessful()) {
            throw new RuntimeException("Pinecone 삭제 실패: " + response.body().string());
        }

        System.out.println("✅ FAQ #" + id + " Pinecone에서 삭제 완료");
    }
}

