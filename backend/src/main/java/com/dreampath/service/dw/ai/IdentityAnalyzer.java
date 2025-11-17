package com.dreampath.service.dw.ai;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;

/**
 * 실시간 정체성 분석 AI 어시스턴트
 * 
 * 대화가 진행되는 동안 학생의 진로 정체성을 점진적으로 분석하고 업데이트합니다.
 */
public interface IdentityAnalyzer {

    /**
     * 현재까지의 대화를 바탕으로 정체성 명확도를 평가합니다.
     * 
     * @return 0-100 사이의 점수 (명확도)
     */
    @SystemMessage("""
            대화 내용을 분석하여 학생의 진로 정체성이 얼마나 명확해졌는지 평가하세요.
            
            평가 기준:
            - 0-20: 아직 탐색 초기, 표면적인 대화
            - 21-40: 흥미나 성향의 단서가 보이기 시작
            - 41-60: 구체적인 패턴과 선호가 드러남
            - 61-80: 가치관과 방향성이 명확해짐
            - 81-100: 정체성이 확립되어 진로 연결 가능
            
            JSON 형식으로 응답하세요:
            {
              "clarity": 숫자 (0-100),
              "reason": "평가 이유"
            }
            """)
    String assessClarity(@UserMessage String conversationHistory);

    /**
     * 현재까지 드러난 정체성 특징을 추출합니다.
     */
    @SystemMessage("""
            대화에서 드러난 학생의 정체성 특징을 추출하세요.
            
            다음 형식의 JSON으로 응답하세요:
            {
              "identityCore": "핵심 정체성 한 문장 (예: 창작을 통해 사람들과 연결되는 사람)",
              "confidence": 확신도 (0-100),
              "traits": [
                {
                  "category": "성향|가치관|흥미|재능",
                  "trait": "특징",
                  "evidence": "대화에서의 근거"
                }
              ],
              "insights": [
                "인사이트1: 대화에서 발견한 중요한 패턴",
                "인사이트2: ..."
              ],
              "nextFocus": "다음에 더 탐색해야 할 부분"
            }
            
            중요: 아직 명확하지 않으면 identityCore를 "탐색 중..."으로 설정하세요.
            """)
    String extractIdentity(@UserMessage String conversationHistory);

    /**
     * 대화 중 발견한 즉각적인 인사이트를 생성합니다.
     */
    @SystemMessage("""
            방금 전 대화에서 중요한 정체성 단서를 발견했다면 알려주세요.
            
            다음 형식의 JSON으로 응답하세요:
            {
              "hasInsight": true/false,
              "insight": "발견한 인사이트 (짧게, 1-2문장)",
              "type": "성향|가치관|흥미|재능"
            }
            
            예시:
            - "방금 말한 것에서 사용자 경험에 대한 깊은 관심이 보여요"
            - "사람들에게 긍정적 영향을 주는 게 정말 중요한 가치구나"
            
            중요: 정말 의미있는 발견이 있을 때만 hasInsight를 true로 하세요.
            """)
    String generateInsight(
        @UserMessage("최근 메시지") String recentMessages,
        @V("context") String previousContext
    );

    /**
     * 현재 단계에서 다음 단계로 넘어갈 준비가 되었는지 평가합니다.
     */
    @SystemMessage("""
            현재 대화 단계: {{currentStage}}
            
            이 단계에서 충분히 탐색이 이루어졌는지 평가하세요.
            
            다음 형식의 JSON으로 응답하세요:
            {
              "readyToProgress": true/false,
              "reason": "판단 이유",
              "recommendation": "더 탐색해야 할 부분 또는 다음 단계 제안"
            }
            
            평가 기준:
            - PRESENT: 현재 감정과 고민이 명확히 드러났는가?
            - PAST: 의미있는 경험과 몰입 순간을 찾았는가?
            - VALUES: 핵심 가치관이 드러났는가?
            - FUTURE: 지향하는 미래 모습이 그려졌는가?
            """)
    String assessStageProgress(
        @UserMessage String conversationHistory,
        @V("currentStage") String currentStage
    );
}

