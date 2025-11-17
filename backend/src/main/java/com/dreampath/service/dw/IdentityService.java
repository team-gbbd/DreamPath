package com.dreampath.service.dw;

import com.dreampath.dto.dw.IdentityStatus;
import com.dreampath.entity.dw.CareerSession;
import com.dreampath.entity.dw.ConversationStage;
import com.dreampath.repository.dw.CareerSessionRepository;
import com.dreampath.service.dw.ai.IdentityAnalyzer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * 실시간 정체성 분석 서비스
 * 
 * 대화가 진행되는 동안 학생의 진로 정체성을 지속적으로 분석하고 업데이트합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IdentityService {

    private final CareerSessionRepository sessionRepository;
    private final CareerChatService chatService;
    private final IdentityAnalyzer identityAnalyzer;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 현재 정체성 상태를 조회합니다.
     */
    @Transactional(readOnly = true)
    public IdentityStatus getIdentityStatus(String sessionId) {
        log.info("정체성 상태 조회 - 세션: {}", sessionId);
        
        CareerSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
        
        String conversationHistory = chatService.getConversationHistory(sessionId);
        
        // AI를 통한 분석
        String clarityJson = identityAnalyzer.assessClarity(conversationHistory);
        String identityJson = identityAnalyzer.extractIdentity(conversationHistory);
        
        return buildIdentityStatus(session, clarityJson, identityJson, null);
    }

    /**
     * 새 메시지 후 정체성 상태를 업데이트합니다.
     */
    @Transactional(readOnly = true)
    public IdentityStatus updateIdentityStatus(String sessionId, String recentMessages) {
        log.info("정체성 상태 업데이트 - 세션: {}", sessionId);
        
        CareerSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
        
        String conversationHistory = chatService.getConversationHistory(sessionId);
        
        // AI 분석
        String clarityJson = identityAnalyzer.assessClarity(conversationHistory);
        String identityJson = identityAnalyzer.extractIdentity(conversationHistory);
        
        // 최근 인사이트 생성
        String insightJson = identityAnalyzer.generateInsight(recentMessages, conversationHistory);
        
        return buildIdentityStatus(session, clarityJson, identityJson, insightJson);
    }

    /**
     * 다음 단계로 진행 가능한지 평가합니다.
     */
    @Transactional
    public boolean shouldProgressToNextStage(String sessionId) {
        CareerSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
        
        // 최소 메시지 수 체크
        if (session.getStageMessageCount() < session.getCurrentStage().getMinMessages()) {
            return false;
        }
        
        // AI의 판단 요청
        String conversationHistory = chatService.getConversationHistory(sessionId);
        String progressJson = identityAnalyzer.assessStageProgress(
            conversationHistory,
            session.getCurrentStage().name()
        );
        
        try {
            JsonNode node = objectMapper.readTree(extractJson(progressJson));
            boolean ready = node.get("readyToProgress").asBoolean(false);
            
            if (ready) {
                log.info("단계 진행 준비 완료 - 세션: {}, 현재 단계: {}", 
                    sessionId, session.getCurrentStage());
                
                // 다음 단계로 이동
                session.setCurrentStage(session.getCurrentStage().next());
                session.setStageMessageCount(0);
                sessionRepository.save(session);
                
                return true;
            }
        } catch (Exception e) {
            log.error("단계 진행 평가 실패", e);
        }
        
        return false;
    }

    /**
     * IdentityStatus 객체 구축
     */
    private IdentityStatus buildIdentityStatus(
            CareerSession session,
            String clarityJson,
            String identityJson,
            String insightJson) {
        
        try {
            // Clarity 파싱
            JsonNode clarityNode = objectMapper.readTree(extractJson(clarityJson));
            int clarity = clarityNode.get("clarity").asInt(0);
            String clarityReason = clarityNode.get("reason").asText("");
            
            // Identity 파싱
            JsonNode identityNode = objectMapper.readTree(extractJson(identityJson));
            String identityCore = identityNode.get("identityCore").asText("탐색 중...");
            int confidence = identityNode.get("confidence").asInt(0);
            String nextFocus = identityNode.get("nextFocus").asText("");
            
            // Traits 파싱
            List<IdentityStatus.IdentityTrait> traits = new ArrayList<>();
            if (identityNode.has("traits")) {
                for (JsonNode traitNode : identityNode.get("traits")) {
                    traits.add(IdentityStatus.IdentityTrait.builder()
                        .category(traitNode.get("category").asText())
                        .trait(traitNode.get("trait").asText())
                        .evidence(traitNode.get("evidence").asText())
                        .build());
                }
            }
            
            // Insights 파싱
            List<String> insights = new ArrayList<>();
            if (identityNode.has("insights")) {
                for (JsonNode insightNode : identityNode.get("insights")) {
                    insights.add(insightNode.asText());
                }
            }
            
            // Recent Insight 파싱
            IdentityStatus.RecentInsight recentInsight = null;
            if (insightJson != null) {
                JsonNode insightNode = objectMapper.readTree(extractJson(insightJson));
                recentInsight = IdentityStatus.RecentInsight.builder()
                    .hasInsight(insightNode.get("hasInsight").asBoolean(false))
                    .insight(insightNode.has("insight") ? insightNode.get("insight").asText() : null)
                    .type(insightNode.has("type") ? insightNode.get("type").asText() : null)
                    .build();
            }
            
            ConversationStage stage = session.getCurrentStage();
            
            return IdentityStatus.builder()
                .sessionId(session.getSessionId())
                .currentStage(stage.getDisplayName())
                .stageDescription(stage.getDescription())
                .overallProgress(stage.getProgress())
                .clarity(clarity)
                .clarityReason(clarityReason)
                .identityCore(identityCore)
                .confidence(confidence)
                .traits(traits)
                .insights(insights)
                .nextFocus(nextFocus)
                .recentInsight(recentInsight)
                .build();
                
        } catch (Exception e) {
            log.error("IdentityStatus 구축 실패", e);
            
            // 기본 응답 반환
            ConversationStage stage = session.getCurrentStage();
            return IdentityStatus.builder()
                .sessionId(session.getSessionId())
                .currentStage(stage.getDisplayName())
                .stageDescription(stage.getDescription())
                .overallProgress(stage.getProgress())
                .clarity(0)
                .clarityReason("분석 중...")
                .identityCore("탐색 중...")
                .confidence(0)
                .traits(new ArrayList<>())
                .insights(new ArrayList<>())
                .nextFocus("대화를 계속해주세요")
                .build();
        }
    }

    private String extractJson(String response) {
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
}

