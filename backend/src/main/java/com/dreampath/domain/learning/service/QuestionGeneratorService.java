package com.dreampath.domain.learning.service;

import com.dreampath.domain.learning.entity.WeeklyQuestion;
import com.dreampath.domain.learning.entity.WeeklySession;
import com.dreampath.global.enums.Difficulty;
import com.dreampath.global.enums.QuestionType;
import com.dreampath.domain.learning.repository.WeeklyQuestionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionGeneratorService {

    private final WeeklyQuestionRepository questionRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${python.ai.service.url:http://localhost:8000}")
    private String pythonServiceUrl;

    // Self-injection for @Transactional proxy to work
    @org.springframework.context.annotation.Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private QuestionGeneratorService self;

    /**
     * AI 문제 생성 - 커넥션 누수 방지를 위해 트랜잭션 분리
     * HTTP 호출은 트랜잭션 밖에서 수행
     */
    public List<WeeklyQuestion> generateQuestions(WeeklySession session, String domain, int count) {
        log.info("AI 문제 생성 시작 - 세션: {}, 주차: {}, 도메인: {}",
                 session.getWeeklyId(), session.getWeekNumber(), domain);

        // 1. 이미 문제가 존재하는지 확인 (짧은 트랜잭션 - self를 통해 호출해야 프록시가 동작)
        List<WeeklyQuestion> existingQuestions = self.getExistingQuestions(session.getWeeklyId());
        if (!existingQuestions.isEmpty()) {
            log.info("이미 문제가 존재함 - 세션: {}, 기존 문제 수: {}", session.getWeeklyId(), existingQuestions.size());
            return existingQuestions;
        }

        // 2. Python AI Service 호출 (트랜잭션 밖 - 시간이 오래 걸림)
        List<Map<String, Object>> generatedQuestions = callPythonService(domain, session.getWeekNumber(), count);

        // 3. 응답을 저장 (짧은 트랜잭션 - self를 통해 호출해야 프록시가 동작)
        List<WeeklyQuestion> questions = convertToEntities(generatedQuestions, session);
        return self.saveQuestions(questions);
    }

    @Transactional(readOnly = true)
    public List<WeeklyQuestion> getExistingQuestions(Long weeklyId) {
        return questionRepository.findByWeeklySessionWeeklyIdOrderByOrderNumAsc(weeklyId);
    }

    @Transactional
    public List<WeeklyQuestion> saveQuestions(List<WeeklyQuestion> questions) {
        return questionRepository.saveAll(questions);
    }

    private List<Map<String, Object>> callPythonService(String domain, int weekNumber, int count) {
        String url = pythonServiceUrl + "/api/learning/generate-questions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = Map.of(
            "domain", domain,
            "weekNumber", weekNumber,
            "count", count
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        try {
            log.info("Python AI Service 호출: {}", url);
            ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                request,
                Map.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                Boolean success = (Boolean) body.get("success");

                if (Boolean.TRUE.equals(success)) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> questions = (List<Map<String, Object>>) body.get("questions");
                    log.info("Python AI Service 응답: {}개 문제 생성됨", questions.size());
                    return questions;
                }
            }

            throw new RuntimeException("Python AI Service 응답 오류");

        } catch (Exception e) {
            log.error("Python AI Service 호출 실패: {}", e.getMessage());
            throw new RuntimeException("AI 문제 생성 실패: " + e.getMessage(), e);
        }
    }

    private List<WeeklyQuestion> convertToEntities(List<Map<String, Object>> questionMaps, WeeklySession session) {
        List<WeeklyQuestion> questions = new ArrayList<>();

        int orderNum = 1;
        for (Map<String, Object> qMap : questionMaps) {
            try {
                WeeklyQuestion question = new WeeklyQuestion();
                question.setWeeklySession(session);
                question.setQuestionType(QuestionType.valueOf((String) qMap.get("type")));
                question.setDifficulty(Difficulty.valueOf((String) qMap.get("difficulty")));
                question.setQuestionText((String) qMap.get("question"));

                // maxScore 처리 (Integer 또는 Double 가능)
                Object maxScoreObj = qMap.get("maxScore");
                if (maxScoreObj instanceof Integer) {
                    question.setMaxScore((Integer) maxScoreObj);
                } else if (maxScoreObj instanceof Double) {
                    question.setMaxScore(((Double) maxScoreObj).intValue());
                } else {
                    question.setMaxScore(10); // 기본값
                }

                question.setOrderNum(orderNum++);

                // options를 JSON 문자열로 저장
                if (qMap.containsKey("options") && qMap.get("options") != null) {
                    question.setOptions(objectMapper.writeValueAsString(qMap.get("options")));
                }

                // 정답 저장
                if (qMap.containsKey("answer")) {
                    question.setCorrectAnswer((String) qMap.get("answer"));
                }

                questions.add(question);

            } catch (Exception e) {
                log.error("문제 변환 오류: {}", e.getMessage());
            }
        }

        return questions;
    }

    @Transactional(readOnly = true)
    public List<WeeklyQuestion> getSessionQuestions(Long weeklyId) {
        return questionRepository.findByWeeklySessionWeeklyIdOrderByOrderNumAsc(weeklyId);
    }
}
