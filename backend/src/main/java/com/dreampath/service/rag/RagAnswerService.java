package com.dreampath.service.rag;

import lombok.RequiredArgsConstructor;
import okhttp3.*;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RagAnswerService {

    @Value("${openai.api.key}")
    private String openaiApiKey;

    private final OkHttpClient client = new OkHttpClient();

    /**
     * FAQ 전용 답변 생성 메서드 (기존 메서드 - 하위 호환성 유지)
     * DreamPath FAQ 챗봇에서 사용
     */
    public String generateAnswer(String question, JSONArray matches) {
        // FAQ 형식으로 context 생성
        StringBuilder context = new StringBuilder();

        for (int i = 0; i < matches.length(); i++) {
            JSONObject m = matches.getJSONObject(i);

            if (m.has("metadata")) {
                JSONObject metadata = m.getJSONObject("metadata");

                if (metadata.has("question") && metadata.has("answer")) {
                    String faqQ = metadata.getString("question");
                    String faqA = metadata.getString("answer");
                    context.append("Q: ").append(faqQ).append("\n");
                    context.append("A: ").append(faqA).append("\n\n");
                } else if (metadata.has("text")) {
                    context.append("- ").append(metadata.getString("text")).append("\n");
                }
            }
        }

        String systemRole = "FAQ 기반 고객 상담 챗봇";
        String instruction = """
                중요:
                - FAQ의 질문과 사용자 질문이 유사한 의미라면 해당 FAQ의 답변을 사용하세요.
                - FAQ 답변을 자연스럽게 다시 말해서 전달하세요.
                - FAQ에 관련 정보가 전혀 없을 때만 "죄송하지만 해당 질문에 대한 정보가 없습니다. 메인페이지 하단 문의하기를 통해 문의를 남겨주세요."라고 답변하세요.
                """;

        // 제너럴 메서드 호출
        return generateAnswer(question, context.toString(), systemRole, instruction);
    }

    /**
     * 범용 답변 생성 메서드 (다른 프로젝트에서 재사용 가능)
     *
     * @param question 사용자 질문
     * @param context 참고할 정보 (자유 형식)
     * @param systemRole 챗봇의 역할 (예: "FAQ 상담 챗봇", "문서 검색 도우미" 등)
     * @param instruction 답변 생성 시 지켜야 할 규칙 (null 가능)
     * @return GPT가 생성한 답변
     */
    public String generateAnswer(String question, String context, String systemRole, String instruction) {
        String instructionText = (instruction != null && !instruction.isBlank())
                ? instruction
                : "제공된 정보를 참고하여 정확하게 답변하세요.";

        String prompt = """
                당신은 %s입니다.
                아래 정보를 참고하여 사용자의 질문에 답변해주세요.

                %s

                참고 정보:
                %s

                사용자 질문: %s

                친절하고 자연스럽게 한국어로 답변하세요.
                """.formatted(systemRole, instructionText, context, question);

        try {
            JSONObject msg = new JSONObject()
                    .put("role", "user")
                    .put("content", prompt);

            JSONObject json = new JSONObject()
                    .put("model", "gpt-4o-mini")
                    .put("messages", new JSONArray().put(msg));

            RequestBody body = RequestBody.create(
                    json.toString(),
                    MediaType.parse("application/json")
            );

            Request request = new Request.Builder()
                    .url("https://api.openai.com/v1/chat/completions")
                    .addHeader("Authorization", "Bearer " + openaiApiKey)
                    .post(body)
                    .build();

            Response response = client.newCall(request).execute();
            String responseBody = response.body().string();

            JSONObject obj = new JSONObject(responseBody);
            return obj.getJSONArray("choices")
                    .getJSONObject(0)
                    .getJSONObject("message")
                    .getString("content");

        } catch (Exception e) {
            throw new RuntimeException("GPT 답변 생성 실패", e);
        }
    }
}
