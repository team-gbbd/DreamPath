package com.dreampath.domain.career.service;

import com.dreampath.domain.career.dto.IdentityStatus;
import com.dreampath.domain.career.entity.CareerSession;
import com.dreampath.domain.career.entity.ConversationStage;
import com.dreampath.domain.career.repository.CareerSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 실시간 정체성 분석 서비스
 * 
 * 대화가 진행되는 동안 학생의 진로 정체성을 지속적으로 분석하고 업데이트합니다.
 * Python AI 서비스의 LangChain 기반 정체성 분석을 사용합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IdentityService {

    private final CareerSessionRepository sessionRepository;
    private final CareerChatService chatService;
    private final PythonIdentityService pythonIdentityService;

    /**
     * 현재 정체성 상태를 조회합니다.
     */
    @Transactional(readOnly = true)
    public IdentityStatus getIdentityStatus(String sessionId) {
        log.info("정체성 상태 조회 - 세션: {}", sessionId);

        CareerSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));

        String conversationHistory = chatService.getConversationHistory(sessionId);
        String userId = session.getUserId();  // userId 가져오기

        // Python AI 서비스를 통한 분석 (userId 포함)
        Map<String, Object> clarityResult = pythonIdentityService.assessClarity(conversationHistory, userId);
        Map<String, Object> identityResult = pythonIdentityService.extractIdentity(conversationHistory, userId);

        return buildIdentityStatus(session, clarityResult, identityResult, null);
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
        String userId = session.getUserId();  // userId 가져오기

        // Python AI 서비스를 통한 분석 (userId 포함)
        Map<String, Object> clarityResult = pythonIdentityService.assessClarity(conversationHistory, userId);
        Map<String, Object> identityResult = pythonIdentityService.extractIdentity(conversationHistory, userId);

        // 최근 인사이트 생성
        Map<String, Object> insightResult = pythonIdentityService.generateInsight(recentMessages, conversationHistory);

        return buildIdentityStatus(session, clarityResult, identityResult, insightResult);
    }

    /**
     * 기본 정체성 상태 반환 (설문조사 미완료 시 사용)
     */
    @Transactional(readOnly = true)
    public IdentityStatus getDefaultIdentityStatus(String sessionId) {
        log.info("기본 정체성 상태 조회 - 세션: {}", sessionId);
        
        CareerSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
        
        ConversationStage stage = session.getCurrentStage();
        
        return IdentityStatus.builder()
                .sessionId(session.getSessionId())
                .currentStage(stage.getDisplayName())
                .stageDescription(stage.getDescription())
                .overallProgress(stage.getProgress())
                .clarity(0)
                .clarityReason("설문조사를 완료하면 정체성 탐색을 시작할 수 있습니다")
                .identityCore("탐색 전")
                .confidence(0)
                .traits(new ArrayList<>())
                .insights(new ArrayList<>())
                .nextFocus("설문조사를 완료해주세요")
                .recentInsight(null)
                .build();
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

        // Python AI 서비스의 판단 요청 (userId 포함)
        String conversationHistory = chatService.getConversationHistory(sessionId);
        String userId = session.getUserId();
        Map<String, Object> progressResult = pythonIdentityService.assessStageProgress(
            conversationHistory,
            session.getCurrentStage().name(),
            userId
        );
        
        try {
            boolean ready = (Boolean) progressResult.get("readyToProgress");
            
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
    @SuppressWarnings("unchecked")
    private IdentityStatus buildIdentityStatus(
            CareerSession session,
            Map<String, Object> clarityResult,
            Map<String, Object> identityResult,
            Map<String, Object> insightResult) {
        
        try {
            // Clarity 파싱
            int clarity = ((Number) clarityResult.get("clarity")).intValue();
            String clarityReason = (String) clarityResult.get("reason");
            
            // Identity 파싱
            String identityCore = (String) identityResult.getOrDefault("identityCore", "탐색 중...");
            int confidence = ((Number) identityResult.getOrDefault("confidence", 0)).intValue();
            String nextFocus = (String) identityResult.getOrDefault("nextFocus", "");
            
            // Traits 파싱
            List<IdentityStatus.IdentityTrait> traits = new ArrayList<>();
            List<Map<String, Object>> traitsList = (List<Map<String, Object>>) identityResult.get("traits");
            if (traitsList != null) {
                for (Map<String, Object> traitMap : traitsList) {
                    traits.add(IdentityStatus.IdentityTrait.builder()
                        .category((String) traitMap.get("category"))
                        .trait((String) traitMap.get("trait"))
                        .evidence((String) traitMap.get("evidence"))
                        .build());
                }
            }
            
            // Insights 파싱
            List<String> insights = new ArrayList<>();
            List<Object> insightsList = (List<Object>) identityResult.get("insights");
            if (insightsList != null) {
                for (Object insight : insightsList) {
                    insights.add(insight.toString());
                }
            }
            
            // Recent Insight 파싱
            IdentityStatus.RecentInsight recentInsight = null;
            if (insightResult != null) {
                recentInsight = IdentityStatus.RecentInsight.builder()
                    .hasInsight((Boolean) insightResult.getOrDefault("hasInsight", false))
                    .insight((String) insightResult.get("insight"))
                    .type((String) insightResult.get("type"))
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
}

