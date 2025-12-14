package com.dreampath.domain.career.service;

import com.dreampath.domain.career.dto.IdentityStatus;
import com.dreampath.domain.career.entity.CareerSession;
import com.dreampath.domain.career.entity.ConversationStage;
import com.dreampath.domain.career.repository.CareerSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

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
    private final TransactionTemplate txTemplate;

    private static class IdentityContext {
        String sessionId;
        String userId;
        String conversationHistory;
    }

    private static class StageContext {
        String sessionId;
        String userId;
        String currentStage;
        int messageCount;
        int minMessages;
        String conversationHistory;
    }

    /**
     * 세션 소유권 검증
     */
    public void validateSessionOwnership(String sessionId, Long userId) {
        CareerSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));

        String sessionUserId = session.getUserId();
        if (sessionUserId == null || !sessionUserId.equals(String.valueOf(userId))) {
            throw new SecurityException("해당 세션에 대한 접근 권한이 없습니다.");
        }
    }

    public IdentityStatus getIdentityStatus(String sessionId) {
        log.info("정체성 상태 조회 - 세션: {}", sessionId);

        IdentityContext context = txTemplate.execute(status -> {
            CareerSession session = sessionRepository.findBySessionId(sessionId)
                    .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
            IdentityContext ctx = new IdentityContext();
            ctx.sessionId = sessionId;
            ctx.userId = session.getUserId();
            ctx.conversationHistory = chatService.getConversationHistory(sessionId);
            return ctx;
        });

        // 병렬 실행 (2개 API 동시 호출) - sessionId 전달
        CompletableFuture<Map<String, Object>> clarityFuture = CompletableFuture.supplyAsync(() ->
                pythonIdentityService.assessClarity(context.conversationHistory, context.sessionId));
        CompletableFuture<Map<String, Object>> identityFuture = CompletableFuture.supplyAsync(() ->
                pythonIdentityService.extractIdentity(context.conversationHistory, context.sessionId));

        CompletableFuture.allOf(clarityFuture, identityFuture).join();

        Map<String, Object> clarityResult = clarityFuture.join();
        Map<String, Object> identityResult = identityFuture.join();

        return txTemplate.execute(status -> {
            CareerSession session = sessionRepository.findBySessionId(sessionId)
                    .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
            return buildIdentityStatus(session, clarityResult, identityResult, null);
        });
    }

    public IdentityStatus updateIdentityStatus(String sessionId, String recentMessages) {
        log.info("정체성 상태 업데이트 - 세션: {}", sessionId);

        IdentityContext context = txTemplate.execute(status -> {
            CareerSession session = sessionRepository.findBySessionId(sessionId)
                    .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
            IdentityContext ctx = new IdentityContext();
            ctx.sessionId = sessionId;
            ctx.userId = session.getUserId();
            ctx.conversationHistory = chatService.getConversationHistory(sessionId);
            return ctx;
        });

        // 병렬 실행 (3개 API 동시 호출) - sessionId 전달
        CompletableFuture<Map<String, Object>> clarityFuture = CompletableFuture.supplyAsync(() ->
                pythonIdentityService.assessClarity(context.conversationHistory, context.sessionId));
        CompletableFuture<Map<String, Object>> identityFuture = CompletableFuture.supplyAsync(() ->
                pythonIdentityService.extractIdentity(context.conversationHistory, context.sessionId));
        CompletableFuture<Map<String, Object>> insightFuture = CompletableFuture.supplyAsync(() ->
                pythonIdentityService.generateInsight(recentMessages, context.conversationHistory));

        CompletableFuture.allOf(clarityFuture, identityFuture, insightFuture).join();

        Map<String, Object> clarityResult = clarityFuture.join();
        Map<String, Object> identityResult = identityFuture.join();
        Map<String, Object> insightResult = insightFuture.join();

        return txTemplate.execute(status -> {
            CareerSession session = sessionRepository.findBySessionId(sessionId)
                    .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
            return buildIdentityStatus(session, clarityResult, identityResult, insightResult);
        });
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

    public boolean shouldProgressToNextStage(String sessionId) {
        StageContext stageContext = txTemplate.execute(status -> {
            CareerSession session = sessionRepository.findBySessionId(sessionId)
                    .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
            StageContext ctx = new StageContext();
            ctx.sessionId = sessionId;
            ctx.userId = session.getUserId();
            ctx.currentStage = session.getCurrentStage().name();
            ctx.messageCount = session.getStageMessageCount();
            ctx.minMessages = session.getCurrentStage().getMinMessages();
            ctx.conversationHistory = chatService.getConversationHistory(sessionId);
            return ctx;
        });

        if (stageContext.messageCount < stageContext.minMessages) {
            return false;
        }

        // Python AI 서비스의 판단 요청 (sessionId 전달)
        Map<String, Object> progressResult = pythonIdentityService.assessStageProgress(
            stageContext.conversationHistory,
            stageContext.currentStage,
            stageContext.sessionId
        );

        try {
            boolean ready = (Boolean) progressResult.get("readyToProgress");
            if (ready) {
                log.info("단계 진행 준비 완료 - 세션: {}, 현재 단계: {}", sessionId, stageContext.currentStage);
                txTemplate.executeWithoutResult(status -> {
                    CareerSession session = sessionRepository.findBySessionId(sessionId)
                            .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
                    session.setCurrentStage(session.getCurrentStage().next());
                    session.setStageMessageCount(0);
                    sessionRepository.save(session);
                });
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
