package com.dreampath.domain.learning.service;

import com.dreampath.domain.learning.entity.LearningPath;
import com.dreampath.domain.learning.entity.StudentAnswer;
import com.dreampath.domain.learning.entity.WeaknessAnalysis;
import com.dreampath.domain.learning.repository.WeaknessAnalysisRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class WeaknessAnalysisService {

    private final RestTemplate restTemplate;
    private final WeaknessAnalysisRepository weaknessAnalysisRepository;
    private final ObjectMapper objectMapper;

    @Value("${python.ai.service.url:http://localhost:8000}")
    private String pythonServiceUrl;

    /**
     * 오답 데이터를 분석하여 약점 태그 생성
     */
    public WeaknessAnalysisResult analyzeWeaknesses(String domain, List<StudentAnswer> wrongAnswers) {
        if (wrongAnswers == null || wrongAnswers.isEmpty()) {
            return emptyResult();
        }

        log.info("약점 분석 시작 - 도메인: {}, 오답 수: {}", domain, wrongAnswers.size());

        try {
            return callPythonService(domain, wrongAnswers);
        } catch (Exception e) {
            log.error("약점 분석 실패: {}", e.getMessage());
            return fallbackResult(wrongAnswers);
        }
    }

    private WeaknessAnalysisResult callPythonService(String domain, List<StudentAnswer> wrongAnswers) {
        String url = pythonServiceUrl + "/api/learning/analyze-weakness";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // 오답 데이터 변환
        List<Map<String, Object>> wrongAnswerList = new ArrayList<>();
        for (StudentAnswer answer : wrongAnswers) {
            Map<String, Object> wa = new HashMap<>();
            wa.put("questionType", answer.getQuestion().getQuestionType().name());
            wa.put("questionText", answer.getQuestion().getQuestionText());
            wa.put("correctAnswer", answer.getQuestion().getCorrectAnswer() != null ?
                   answer.getQuestion().getCorrectAnswer() : "");
            wa.put("userAnswer", answer.getUserAnswer() != null ? answer.getUserAnswer() : "");
            wa.put("feedback", answer.getAiFeedback() != null ? answer.getAiFeedback() : "");
            wa.put("score", answer.getScore() != null ? answer.getScore() : 0);
            wa.put("maxScore", answer.getQuestion().getMaxScore());
            wrongAnswerList.add(wa);
        }

        Map<String, Object> requestBody = Map.of(
            "domain", domain,
            "wrongAnswers", wrongAnswerList
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        log.info("Python AI Service 호출: {}", url);
        ResponseEntity<Map> response = restTemplate.exchange(
            url,
            HttpMethod.POST,
            request,
            Map.class
        );

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            return parseResponse(response.getBody());
        }

        throw new RuntimeException("Python AI Service 응답 오류");
    }

    @SuppressWarnings("unchecked")
    private WeaknessAnalysisResult parseResponse(Map<String, Object> body) {
        WeaknessAnalysisResult result = new WeaknessAnalysisResult();

        // weaknessTags 파싱
        List<Map<String, Object>> tagsData = (List<Map<String, Object>>) body.get("weaknessTags");
        if (tagsData != null) {
            for (Map<String, Object> tagData : tagsData) {
                WeaknessTag tag = new WeaknessTag();
                tag.tag = (String) tagData.get("tag");
                tag.count = ((Number) tagData.get("count")).intValue();
                tag.severity = (String) tagData.get("severity");
                tag.description = (String) tagData.get("description");
                result.weaknessTags.add(tag);
            }
        }

        // recommendations 파싱
        List<String> recs = (List<String>) body.get("recommendations");
        if (recs != null) {
            result.recommendations.addAll(recs);
        }

        // overallAnalysis 파싱
        result.overallAnalysis = (String) body.get("overallAnalysis");

        // radarData 파싱
        List<Map<String, Object>> radarData = (List<Map<String, Object>>) body.get("radarData");
        if (radarData != null) {
            for (Map<String, Object> rd : radarData) {
                RadarDataItem item = new RadarDataItem();
                item.category = (String) rd.get("category");
                item.score = ((Number) rd.get("score")).intValue();
                item.fullMark = ((Number) rd.get("fullMark")).intValue();
                result.radarData.add(item);
            }
        }

        return result;
    }

    private WeaknessAnalysisResult emptyResult() {
        WeaknessAnalysisResult result = new WeaknessAnalysisResult();
        result.overallAnalysis = "아직 분석할 오답이 충분하지 않습니다.";
        result.recommendations.add("학습을 계속 진행해주세요!");
        result.radarData = getDefaultRadarData(80);
        return result;
    }

    private WeaknessAnalysisResult fallbackResult(List<StudentAnswer> wrongAnswers) {
        WeaknessAnalysisResult result = new WeaknessAnalysisResult();

        // 문제 유형별 오답 카운트
        Map<String, Integer> typeCount = new HashMap<>();
        for (StudentAnswer wa : wrongAnswers) {
            String type = wa.getQuestion().getQuestionType().name();
            typeCount.put(type, typeCount.getOrDefault(type, 0) + 1);
        }

        for (Map.Entry<String, Integer> entry : typeCount.entrySet()) {
            WeaknessTag tag = new WeaknessTag();
            tag.tag = getTypeLabel(entry.getKey()) + " 취약";
            tag.count = entry.getValue();
            tag.severity = entry.getValue() >= 3 ? "high" : entry.getValue() >= 2 ? "medium" : "low";
            tag.description = getTypeLabel(entry.getKey()) + " 유형에서 " + entry.getValue() + "개 오답 발생";
            result.weaknessTags.add(tag);
        }

        result.recommendations.add("틀린 문제의 해설을 다시 읽어보세요");
        result.recommendations.add("관련 개념을 복습해보세요");
        result.recommendations.add("비슷한 유형의 문제를 더 풀어보세요");

        result.overallAnalysis = "총 " + wrongAnswers.size() + "개의 오답이 분석되었습니다. 위 약점 영역을 집중적으로 학습하시기 바랍니다.";
        result.radarData = getDefaultRadarData(55);

        return result;
    }

    private String getTypeLabel(String type) {
        return switch (type) {
            case "MCQ" -> "객관식 문제";
            case "SCENARIO" -> "시나리오 분석";
            case "CODING" -> "코딩 구현";
            case "DESIGN" -> "설계 문제";
            default -> type;
        };
    }

    private List<RadarDataItem> getDefaultRadarData(int defaultScore) {
        List<RadarDataItem> data = new ArrayList<>();
        String[] categories = {"기초 이론", "실무 적용", "문제 해결", "최신 트렌드", "종합 사고"};
        for (String cat : categories) {
            RadarDataItem item = new RadarDataItem();
            item.category = cat;
            item.score = defaultScore;
            item.fullMark = 100;
            data.add(item);
        }
        return data;
    }

    /**
     * DB에서 저장된 약점 분석 결과 조회
     */
    public Optional<WeaknessAnalysisResult> getSavedAnalysis(Long pathId) {
        return weaknessAnalysisRepository.findByLearningPathPathId(pathId)
                .map(this::entityToResult);
    }

    /**
     * 약점 분석 실행 후 DB에 저장
     */
    @Transactional
    public WeaknessAnalysisResult analyzeAndSave(LearningPath learningPath, List<StudentAnswer> wrongAnswers) {
        WeaknessAnalysisResult result = analyzeWeaknesses(learningPath.getDomain(), wrongAnswers);
        saveAnalysis(learningPath, result, wrongAnswers.size());
        return result;
    }

    /**
     * 분석 결과를 DB에 저장
     */
    @Transactional
    public void saveAnalysis(LearningPath learningPath, WeaknessAnalysisResult result, int wrongCount) {
        WeaknessAnalysis analysis = weaknessAnalysisRepository
                .findByLearningPathPathId(learningPath.getPathId())
                .orElse(new WeaknessAnalysis(learningPath));

        try {
            analysis.setWeaknessTags(objectMapper.writeValueAsString(result.weaknessTags));
            analysis.setRadarData(objectMapper.writeValueAsString(result.radarData));
            analysis.setRecommendations(objectMapper.writeValueAsString(result.recommendations));
            analysis.setOverallAnalysis(result.overallAnalysis);
            analysis.setAnalyzedWrongCount(wrongCount);

            weaknessAnalysisRepository.save(analysis);
            log.info("약점 분석 결과 저장 완료 - pathId: {}", learningPath.getPathId());
        } catch (JsonProcessingException e) {
            log.error("약점 분석 결과 JSON 변환 실패: {}", e.getMessage());
        }
    }

    /**
     * 재분석이 필요한지 확인 (새 오답이 추가된 경우)
     */
    public boolean needsReanalysis(Long pathId, int currentWrongCount) {
        return weaknessAnalysisRepository.findByLearningPathPathId(pathId)
                .map(analysis -> analysis.getAnalyzedWrongCount() < currentWrongCount)
                .orElse(true); // 저장된 분석이 없으면 분석 필요
    }

    /**
     * DB 엔티티를 결과 DTO로 변환
     */
    @SuppressWarnings("unchecked")
    private WeaknessAnalysisResult entityToResult(WeaknessAnalysis entity) {
        WeaknessAnalysisResult result = new WeaknessAnalysisResult();
        result.overallAnalysis = entity.getOverallAnalysis();

        try {
            if (entity.getWeaknessTags() != null) {
                List<Map<String, Object>> tagsData = objectMapper.readValue(entity.getWeaknessTags(), List.class);
                for (Map<String, Object> tagData : tagsData) {
                    WeaknessTag tag = new WeaknessTag();
                    tag.tag = (String) tagData.get("tag");
                    tag.count = ((Number) tagData.get("count")).intValue();
                    tag.severity = (String) tagData.get("severity");
                    tag.description = (String) tagData.get("description");
                    result.weaknessTags.add(tag);
                }
            }

            if (entity.getRecommendations() != null) {
                List<String> recs = objectMapper.readValue(entity.getRecommendations(), List.class);
                result.recommendations.addAll(recs);
            }

            if (entity.getRadarData() != null) {
                List<Map<String, Object>> radarData = objectMapper.readValue(entity.getRadarData(), List.class);
                for (Map<String, Object> rd : radarData) {
                    RadarDataItem item = new RadarDataItem();
                    item.category = (String) rd.get("category");
                    item.score = ((Number) rd.get("score")).intValue();
                    item.fullMark = ((Number) rd.get("fullMark")).intValue();
                    result.radarData.add(item);
                }
            }
        } catch (JsonProcessingException e) {
            log.error("약점 분석 결과 JSON 파싱 실패: {}", e.getMessage());
        }

        return result;
    }

    // 결과 DTO 클래스들
    public static class WeaknessAnalysisResult {
        public List<WeaknessTag> weaknessTags = new ArrayList<>();
        public List<String> recommendations = new ArrayList<>();
        public String overallAnalysis = "";
        public List<RadarDataItem> radarData = new ArrayList<>();
    }

    public static class WeaknessTag {
        public String tag;
        public Integer count;
        public String severity;
        public String description;
    }

    public static class RadarDataItem {
        public String category;
        public Integer score;
        public Integer fullMark;
    }
}
