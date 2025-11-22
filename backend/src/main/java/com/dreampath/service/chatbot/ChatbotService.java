package com.dreampath.service.chatbot;

import com.dreampath.dto.chatbot.ChatRequestDto;
import com.dreampath.entity.chatbot.ChatbotMessage;
import com.dreampath.entity.chatbot.ChatbotSession;
import com.dreampath.entity.chatbot.Faq;
import com.dreampath.repository.chatbot.ChatbotMessageRepository;
import com.dreampath.repository.chatbot.ChatbotSessionRepository;
import com.dreampath.repository.chatbot.FaqRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final ChatbotSessionRepository sessionRepository;
    private final ChatbotMessageRepository messageRepository;
    private final FaqRepository faqRepository;

    /** 1) 사용자 메시지 저장 */
    public UUID handleMessage(ChatRequestDto dto) {

        UUID sessionId = dto.getSessionId();

        if (sessionId == null) {
            ChatbotSession newSession = new ChatbotSession();
            newSession.setId(UUID.randomUUID());
            newSession.setUserId(dto.getUserId());
            newSession.setConversationTitle(dto.getConversationTitle());
            newSession.setCreatedAt(LocalDateTime.now());

            sessionRepository.save(newSession);
            sessionId = newSession.getId();
        }

        ChatbotMessage msg = new ChatbotMessage();
        msg.setSessionId(sessionId);
        msg.setUserId(dto.getUserId());
        msg.setRole("user");
        msg.setMessage(dto.getMessage());
        msg.setCreatedAt(LocalDateTime.now());

        messageRepository.save(msg);

        return sessionId;
    }

    /** 2) AI 답변 저장 */
    public void saveAssistantMessage(UUID sessionId, UUID userId, String answer) {
        ChatbotMessage msg = new ChatbotMessage();
        msg.setSessionId(sessionId);
        msg.setUserId(userId);
        msg.setRole("assistant");
        msg.setMessage(answer);
        msg.setCreatedAt(LocalDateTime.now());

        messageRepository.save(msg);
    }

    /** 3) FAQ 기반 답변 생성 */
    public String generateAnswer(UUID sessionId, String message) {

        String userMsg = message.toLowerCase().trim();
        List<Faq> faqs = faqRepository.findAll();


    /* ============================================
       🔥 1) 핵심 키워드 포함 여부 먼저 검사
       ============================================ */
        for (Faq f : faqs) {
            String q = f.getQuestion().toLowerCase();
            String cleanQ = q.replaceAll("[^ㄱ-ㅎ가-힣a-zA-Z0-9 ]", " ").trim();
            String[] tokens = cleanQ.split("\\s+");

            int hit = 0;
            for (String token : tokens) {

                if (token.length() >= 2 && userMsg.contains(token)) {
                    hit++;
                }
            }

            if (hit >= Math.max(1, tokens.length / 2)) {
                return f.getAnswer();
            }
        }

    /* ============================================
       🔥 2) Levenshtein 유사도 보조 매칭
       ============================================ */
        Faq bestMatch = null;
        double bestScore = 0.0;

        for (Faq f : faqs) {
            double score = similarity(userMsg, f.getQuestion().toLowerCase());
            if (score > bestScore) {
                bestScore = score;
                bestMatch = f;
            }
        }

        if (bestMatch != null && bestScore >= 0.25) {
            return bestMatch.getAnswer();
        }

        return "해당 질문에 대한 답변을 찾을 수 없습니다. 문의를 남기시겠어요?";
    }


    /** 유사도 계산 */
    private double similarity(String a, String b) {
        int maxLen = Math.max(a.length(), b.length());
        if (maxLen == 0) return 1.0;
        return (maxLen - levenshtein(a, b)) / (double) maxLen;
    }

    private int levenshtein(String a, String b) {
        int[] costs = new int[b.length() + 1];
        for (int j = 0; j < costs.length; j++) costs[j] = j;

        for (int i = 1; i <= a.length(); i++) {
            costs[0] = i;
            int nw = i - 1;

            for (int j = 1; j <= b.length(); j++) {
                int cj = Math.min(
                        1 + Math.min(costs[j], costs[j - 1]),
                        a.charAt(i - 1) == b.charAt(j - 1) ? nw : nw + 1
                );

                nw = costs[j];
                costs[j] = cj;
            }
        }

        return costs[b.length()];
    }

}
