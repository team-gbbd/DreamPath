package com.dreampath.service.dw;

import com.dreampath.dto.dw.AnalysisResponse;
import com.dreampath.entity.dw.CareerAnalysis;
import com.dreampath.entity.dw.CareerSession;
import com.dreampath.entity.dw.ChatMessage;
import com.dreampath.repository.dw.CareerAnalysisRepository;
import com.dreampath.repository.dw.CareerSessionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CareerAnalysisService {

    private final CareerSessionRepository sessionRepository;
    private final CareerAnalysisRepository analysisRepository;
    private final OpenAIService openAIService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public AnalysisResponse analyzeSession(String sessionId) {
        CareerSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));

        // 대화 내용 수집
        String conversationHistory = session.getMessages().stream()
                .map(msg -> msg.getRole().name() + ": " + msg.getContent())
                .collect(Collectors.joining("\n\n"));

        // 감정 분석
        AnalysisResponse.EmotionAnalysis emotionAnalysis = analyzeEmotion(conversationHistory);

        // 성향 분석
        AnalysisResponse.PersonalityAnalysis personalityAnalysis = analyzePersonality(conversationHistory);

        // 흥미 분석
        AnalysisResponse.InterestAnalysis interestAnalysis = analyzeInterest(conversationHistory);

        // 종합 분석 및 진로 추천
        String comprehensiveAnalysis = generateComprehensiveAnalysis(
                emotionAnalysis, personalityAnalysis, interestAnalysis);
        
        List<AnalysisResponse.CareerRecommendation> recommendations = 
                generateCareerRecommendations(emotionAnalysis, personalityAnalysis, interestAnalysis);

        // 기존 분석 결과가 있는지 확인
        Optional<CareerAnalysis> existingAnalysis = analysisRepository.findBySession(session);
        
        CareerAnalysis analysis;
        if (existingAnalysis.isPresent()) {
            // 기존 분석 업데이트
            log.info("기존 분석 결과 업데이트: sessionId={}", sessionId);
            analysis = existingAnalysis.get();
            analysis.setEmotionAnalysis(emotionAnalysis.getDescription());
            analysis.setEmotionScore(emotionAnalysis.getScore());
            analysis.setPersonalityAnalysis(personalityAnalysis.getDescription());
            analysis.setPersonalityType(personalityAnalysis.getType());
            analysis.setInterestAnalysis(interestAnalysis.getDescription());
            analysis.setInterestAreas(serializeToJson(interestAnalysis.getAreas()));
            analysis.setComprehensiveAnalysis(comprehensiveAnalysis);
            analysis.setRecommendedCareers(serializeToJson(recommendations));
        } else {
            // 새로운 분석 생성
            log.info("새로운 분석 결과 생성: sessionId={}", sessionId);
            analysis = CareerAnalysis.builder()
                    .session(session)
                    .emotionAnalysis(emotionAnalysis.getDescription())
                    .emotionScore(emotionAnalysis.getScore())
                    .personalityAnalysis(personalityAnalysis.getDescription())
                    .personalityType(personalityAnalysis.getType())
                    .interestAnalysis(interestAnalysis.getDescription())
                    .interestAreas(serializeToJson(interestAnalysis.getAreas()))
                    .comprehensiveAnalysis(comprehensiveAnalysis)
                    .recommendedCareers(serializeToJson(recommendations))
                    .build();
            session.setAnalysis(analysis);
        }

        analysisRepository.save(analysis);
        sessionRepository.save(session);

        return AnalysisResponse.builder()
                .sessionId(sessionId)
                .emotion(emotionAnalysis)
                .personality(personalityAnalysis)
                .interest(interestAnalysis)
                .comprehensiveAnalysis(comprehensiveAnalysis)
                .recommendedCareers(recommendations)
                .build();
    }

    private AnalysisResponse.EmotionAnalysis analyzeEmotion(String conversationHistory) {
        String prompt = String.format("""
                다음 대화 내용을 바탕으로 학생의 감정 상태를 분석해주세요.
                
                대화 내용:
                %s
                
                다음 형식의 JSON으로 응답해주세요:
                {
                    "description": "감정 분석 상세 설명",
                    "score": 1-100 사이의 점수 (긍정적일수록 높음),
                    "emotionalState": "긍정적/중립적/부정적/혼합"
                }
                """, conversationHistory);

        List<com.theokanning.openai.completion.chat.ChatMessage> messages = List.of(
                new com.theokanning.openai.completion.chat.ChatMessage("system", 
                        "당신은 심리 분석 전문가입니다. JSON 형식으로만 응답해주세요."),
                new com.theokanning.openai.completion.chat.ChatMessage("user", prompt)
        );

        String response = openAIService.getAnalysis(messages, "emotion");
        return parseEmotionAnalysis(response);
    }

    private AnalysisResponse.PersonalityAnalysis analyzePersonality(String conversationHistory) {
        String prompt = String.format("""
                다음 대화 내용을 바탕으로 학생의 성향을 분석해주세요.
                
                대화 내용:
                %s
                
                다음 형식의 JSON으로 응답해주세요:
                {
                    "description": "성향 분석 상세 설명",
                    "type": "성격 유형 (예: 외향적, 내향적, 분석적 등)",
                    "strengths": ["강점1", "강점2", "강점3"],
                    "growthAreas": ["발전영역1", "발전영역2"]
                }
                """, conversationHistory);

        List<com.theokanning.openai.completion.chat.ChatMessage> messages = List.of(
                new com.theokanning.openai.completion.chat.ChatMessage("system", 
                        "당신은 성격 분석 전문가입니다. JSON 형식으로만 응답해주세요."),
                new com.theokanning.openai.completion.chat.ChatMessage("user", prompt)
        );

        String response = openAIService.getAnalysis(messages, "personality");
        return parsePersonalityAnalysis(response);
    }

    private AnalysisResponse.InterestAnalysis analyzeInterest(String conversationHistory) {
        String prompt = String.format("""
                다음 대화 내용을 바탕으로 학생의 흥미 분야를 분석해주세요.
                
                대화 내용:
                %s
                
                다음 형식의 JSON으로 응답해주세요:
                {
                    "description": "흥미 분석 상세 설명",
                    "areas": [
                        {"name": "분야명1", "level": 1-10, "description": "설명1"},
                        {"name": "분야명2", "level": 1-10, "description": "설명2"}
                    ]
                }
                """, conversationHistory);

        List<com.theokanning.openai.completion.chat.ChatMessage> messages = List.of(
                new com.theokanning.openai.completion.chat.ChatMessage("system", 
                        "당신은 진로 상담 전문가입니다. JSON 형식으로만 응답해주세요."),
                new com.theokanning.openai.completion.chat.ChatMessage("user", prompt)
        );

        String response = openAIService.getAnalysis(messages, "interest");
        return parseInterestAnalysis(response);
    }

    private String generateComprehensiveAnalysis(
            AnalysisResponse.EmotionAnalysis emotion,
            AnalysisResponse.PersonalityAnalysis personality,
            AnalysisResponse.InterestAnalysis interest) {
        
        String prompt = String.format("""
                다음 분석 결과를 종합하여 학생에게 따뜻하고 격려하는 종합 분석을 작성해주세요.
                
                감정 분석: %s (점수: %d, 상태: %s)
                성향 분석: %s (유형: %s)
                흥미 분석: %s
                
                학생이 자신을 더 잘 이해하고 진로 방향을 설정하는 데 도움이 되는 
                따뜻하고 구체적인 조언을 포함해주세요.
                """, 
                emotion.getDescription(), emotion.getScore(), emotion.getEmotionalState(),
                personality.getDescription(), personality.getType(),
                interest.getDescription());

        List<com.theokanning.openai.completion.chat.ChatMessage> messages = List.of(
                new com.theokanning.openai.completion.chat.ChatMessage("system", 
                        "당신은 친근한 진로 상담 전문가입니다."),
                new com.theokanning.openai.completion.chat.ChatMessage("user", prompt)
        );

        return openAIService.getAnalysis(messages, "comprehensive");
    }

    private List<AnalysisResponse.CareerRecommendation> generateCareerRecommendations(
            AnalysisResponse.EmotionAnalysis emotion,
            AnalysisResponse.PersonalityAnalysis personality,
            AnalysisResponse.InterestAnalysis interest) {
        
        String prompt = String.format("""
                다음 분석 결과를 바탕으로 학생에게 적합한 진로를 3-5개 추천해주세요.
                
                감정 분석: %s (점수: %d, 상태: %s)
                성향 분석: %s (유형: %s, 강점: %s)
                흥미 분야: %s
                
                다음 형식의 JSON 배열로 응답해주세요:
                [
                    {
                        "careerName": "진로명",
                        "description": "진로 설명",
                        "matchScore": 1-100,
                        "reasons": ["추천 이유1", "추천 이유2", "추천 이유3"]
                    }
                ]
                """, 
                emotion.getDescription(), emotion.getScore(), emotion.getEmotionalState(),
                personality.getDescription(), personality.getType(), 
                String.join(", ", personality.getStrengths()),
                interest.getDescription());

        List<com.theokanning.openai.completion.chat.ChatMessage> messages = List.of(
                new com.theokanning.openai.completion.chat.ChatMessage("system", 
                        "당신은 진로 추천 전문가입니다. JSON 형식으로만 응답해주세요."),
                new com.theokanning.openai.completion.chat.ChatMessage("user", prompt)
        );

        String response = openAIService.getAnalysis(messages, "career_recommendation");
        return parseCareerRecommendations(response);
    }

    // JSON 파싱 헬퍼 메서드들
    private AnalysisResponse.EmotionAnalysis parseEmotionAnalysis(String json) {
        try {
            String cleanJson = extractJson(json);
            return objectMapper.readValue(cleanJson, AnalysisResponse.EmotionAnalysis.class);
        } catch (JsonProcessingException e) {
            log.error("감정 분석 JSON 파싱 실패", e);
            return AnalysisResponse.EmotionAnalysis.builder()
                    .description("분석 중 오류가 발생했습니다.")
                    .score(50)
                    .emotionalState("중립적")
                    .build();
        }
    }

    private AnalysisResponse.PersonalityAnalysis parsePersonalityAnalysis(String json) {
        try {
            String cleanJson = extractJson(json);
            return objectMapper.readValue(cleanJson, AnalysisResponse.PersonalityAnalysis.class);
        } catch (JsonProcessingException e) {
            log.error("성향 분석 JSON 파싱 실패", e);
            return AnalysisResponse.PersonalityAnalysis.builder()
                    .description("분석 중 오류가 발생했습니다.")
                    .type("미분류")
                    .strengths(new ArrayList<>())
                    .growthAreas(new ArrayList<>())
                    .build();
        }
    }

    private AnalysisResponse.InterestAnalysis parseInterestAnalysis(String json) {
        try {
            String cleanJson = extractJson(json);
            return objectMapper.readValue(cleanJson, AnalysisResponse.InterestAnalysis.class);
        } catch (JsonProcessingException e) {
            log.error("흥미 분석 JSON 파싱 실패", e);
            return AnalysisResponse.InterestAnalysis.builder()
                    .description("분석 중 오류가 발생했습니다.")
                    .areas(new ArrayList<>())
                    .build();
        }
    }

    private List<AnalysisResponse.CareerRecommendation> parseCareerRecommendations(String json) {
        try {
            String cleanJson = extractJson(json);
            return objectMapper.readValue(cleanJson, 
                    objectMapper.getTypeFactory().constructCollectionType(
                            List.class, AnalysisResponse.CareerRecommendation.class));
        } catch (JsonProcessingException e) {
            log.error("진로 추천 JSON 파싱 실패", e);
            return new ArrayList<>();
        }
    }

    private String extractJson(String response) {
        // JSON 코드 블록에서 실제 JSON 추출
        if (response.contains("```json")) {
            int start = response.indexOf("```json") + 7;
            int end = response.lastIndexOf("```");
            if (end > start) {
                return response.substring(start, end).trim();
            }
        } else if (response.contains("```")) {
            int start = response.indexOf("```") + 3;
            int end = response.lastIndexOf("```");
            if (end > start) {
                return response.substring(start, end).trim();
            }
        }
        return response.trim();
    }

    private String serializeToJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.error("JSON 직렬화 실패", e);
            return "{}";
        }
    }
}

