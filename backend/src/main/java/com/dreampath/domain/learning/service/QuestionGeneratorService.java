package com.dreampath.domain.learning.service;

import com.dreampath.domain.learning.entity.WeeklyQuestion;
import com.dreampath.domain.learning.entity.WeeklySession;
import com.dreampath.global.enums.Difficulty;
import com.dreampath.global.enums.QuestionType;
import com.dreampath.domain.learning.repository.WeeklyQuestionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionGeneratorService {

    private final WeeklyQuestionRepository questionRepository;
    private final ObjectMapper objectMapper;

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.model:gpt-4o-mini}")
    private String modelName;

    private ChatLanguageModel chatModel;

    @PostConstruct
    public void init() {
        this.chatModel = OpenAiChatModel.builder()
                .apiKey(apiKey)
                .modelName(modelName)
                .temperature(0.7)
                .build();
    }

    @Transactional
    public List<WeeklyQuestion> generateQuestions(WeeklySession session, String domain, int count) {
        log.info("AI 문제 생성 시작 - 세션: {}, 주차: {}, 도메인: {}",
                 session.getWeeklyId(), session.getWeekNumber(), domain);

        String prompt = buildPrompt(domain, session.getWeekNumber(), count);
        String response = chatModel.generate(prompt);

        List<WeeklyQuestion> questions = parseQuestions(response, session);
        return questionRepository.saveAll(questions);
    }

    private String buildPrompt(String domain, Integer weekNumber, int count) {
        // 도메인에 따라 적절한 문제 유형 결정
        String typeGuidelines = getTypeGuidelines(domain);

        return String.format("""
            당신은 %s 분야의 전문 교육자입니다.
            %d주차 학습을 위한 문제 %d개를 생성해주세요.

            문제는 다음 형식의 JSON 배열로 작성해주세요:
            [
              {
                "type": "MCQ|SCENARIO|CODING|DESIGN",
                "difficulty": "EASY|MEDIUM|HARD",
                "question": "문제 내용",
                "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
                "answer": "정답",
                "maxScore": 점수
              }
            ]

            %s

            규칙:
            - 난이도: EASY(10점), MEDIUM(20점), HARD(30점)
            - 문제는 실무 중심으로 구성
            - 도메인의 특성을 반영한 문제를 만드세요
            - JSON만 출력 (다른 설명 없이)
            """, domain, weekNumber, count, typeGuidelines);
    }

    private String getTypeGuidelines(String domain) {
        String domainLower = domain.toLowerCase();

        // IT/프로그래밍 관련
        if (domainLower.contains("프로그래밍") || domainLower.contains("개발") ||
            domainLower.contains("코딩") || domainLower.contains("소프트웨어") ||
            domainLower.contains("programming") || domainLower.contains("coding")) {
            return """
                문제 유형:
                - MCQ: 개념/이론 객관식 문제
                - SCENARIO: 실무 상황 기반 문제 해결
                - CODING: 코드 작성/분석 문제
                - DESIGN: 시스템 설계/아키텍처 문제
                """;
        }

        // 디자인/예술 관련
        if (domainLower.contains("디자인") || domainLower.contains("design") ||
            domainLower.contains("예술") || domainLower.contains("미술")) {
            return """
                문제 유형:
                - MCQ: 디자인 원칙/이론 객관식 문제
                - SCENARIO: 클라이언트 요구사항 기반 문제
                - DESIGN: 디자인 컨셉/레이아웃 설계 문제
                (CODING 유형은 사용하지 마세요)
                """;
        }

        // 비즈니스/금융/경제 관련
        if (domainLower.contains("금융") || domainLower.contains("경제") ||
            domainLower.contains("비즈니스") || domainLower.contains("경영") ||
            domainLower.contains("finance") || domainLower.contains("business")) {
            return """
                문제 유형:
                - MCQ: 개념/이론 객관식 문제
                - SCENARIO: 비즈니스 상황 분석 및 의사결정 문제
                (CODING, DESIGN 유형은 사용하지 마세요)
                """;
        }

        // 인문/사회/정치 관련
        if (domainLower.contains("정치") || domainLower.contains("사회") ||
            domainLower.contains("역사") || domainLower.contains("철학") ||
            domainLower.contains("문학") || domainLower.contains("심리")) {
            return """
                문제 유형:
                - MCQ: 개념/이론 객관식 문제
                - SCENARIO: 사례 분석 및 비판적 사고 문제
                (CODING, DESIGN 유형은 사용하지 마세요)
                """;
        }

        // 기타 - 안전하게 MCQ와 SCENARIO만
        return """
            문제 유형:
            - MCQ: 개념/이론 객관식 문제
            - SCENARIO: 실무/사례 기반 분석 문제
            (CODING, DESIGN 유형은 해당 도메인에 적합할 경우에만 사용하세요)
            """;
    }

    private List<WeeklyQuestion> parseQuestions(String jsonResponse, WeeklySession session) {
        List<WeeklyQuestion> questions = new ArrayList<>();

        try {
            // JSON 파싱
            String cleanedJson = extractJsonArray(jsonResponse);
            List<Map<String, Object>> questionMaps = objectMapper.readValue(
                cleanedJson,
                new TypeReference<List<Map<String, Object>>>() {}
            );

            int orderNum = 1;
            for (Map<String, Object> qMap : questionMaps) {
                WeeklyQuestion question = new WeeklyQuestion();
                question.setWeeklySession(session);
                question.setQuestionType(QuestionType.valueOf((String) qMap.get("type")));
                question.setDifficulty(Difficulty.valueOf((String) qMap.get("difficulty")));
                question.setQuestionText((String) qMap.get("question"));
                question.setMaxScore((Integer) qMap.get("maxScore"));
                question.setOrderNum(orderNum++);

                // options를 JSONB로 저장
                if (qMap.containsKey("options")) {
                    question.setOptions(objectMapper.writeValueAsString(qMap.get("options")));
                }

                // 정답 저장
                if (qMap.containsKey("answer")) {
                    question.setCorrectAnswer((String) qMap.get("answer"));
                }

                questions.add(question);
            }

        } catch (JsonProcessingException e) {
            log.error("JSON 파싱 오류: {}", e.getMessage());
            throw new RuntimeException("AI 응답 파싱 실패", e);
        }

        return questions;
    }

    private String extractJsonArray(String response) {
        // 응답에서 JSON 배열 부분만 추출
        int start = response.indexOf('[');
        int end = response.lastIndexOf(']') + 1;

        if (start >= 0 && end > start) {
            return response.substring(start, end);
        }

        return response;
    }

    @Transactional(readOnly = true)
    public List<WeeklyQuestion> getSessionQuestions(Long weeklyId) {
        return questionRepository.findByWeeklySessionWeeklyIdOrderByOrderNumAsc(weeklyId);
    }
}
