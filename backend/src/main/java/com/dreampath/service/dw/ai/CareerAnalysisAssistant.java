package com.dreampath.service.dw.ai;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;

/**
 * 진로 분석 AI 어시스턴트
 * 
 * 대화 내용을 기반으로 학생의 정체성을 분석하고 진로를 제안합니다.
 */
public interface CareerAnalysisAssistant {

    /**
     * 학생의 감정 상태를 분석합니다.
     */
    @SystemMessage("""
            학생과의 대화 내용을 바탕으로 학생의 감정 상태를 분석해주세요.
            
            다음 형식의 JSON으로 응답해주세요:
            {
              "mainEmotion": "주된 감정",
              "description": "감정 상태에 대한 설명",
              "keywords": ["키워드1", "키워드2", "키워드3"]
            }
            
            분석은 한국어로 작성해주세요.
            """)
    String analyzeEmotion(@UserMessage String conversationHistory);

    /**
     * 학생의 성향을 분석합니다.
     */
    @SystemMessage("""
            학생과의 대화 내용을 바탕으로 학생의 성향을 분석해주세요.
            
            다음 형식의 JSON으로 응답해주세요:
            {
              "personalityType": "성향 유형",
              "description": "성향에 대한 설명",
              "strengths": ["강점1", "강점2", "강점3"],
              "traits": ["특성1", "특성2", "특성3"]
            }
            
            분석은 한국어로 작성해주세요.
            """)
    String analyzePersonality(@UserMessage String conversationHistory);

    /**
     * 학생의 흥미 분야를 분석합니다.
     */
    @SystemMessage("""
            학생과의 대화 내용을 바탕으로 학생의 흥미 분야를 분석해주세요.
            
            다음 형식의 JSON으로 응답해주세요:
            {
              "interests": [
                {
                  "area": "흥미 분야",
                  "level": "관심도 (상/중/하)",
                  "description": "설명"
                }
              ],
              "recommendations": ["추천 활동1", "추천 활동2", "추천 활동3"]
            }
            
            분석은 한국어로 작성해주세요.
            """)
    String analyzeInterests(@UserMessage String conversationHistory);

    /**
     * 종합적인 진로 분석 또는 추천을 수행합니다.
     */
    @SystemMessage("""
            당신은 전문적인 진로 분석가입니다.
            학생과의 대화 내용을 분석하여 {{analysisType}}에 대한 상세한 분석을 제공해주세요.
            
            분석 시 다음을 포함해주세요:
            - 핵심 특징 3-5가지
            - 구체적인 예시와 근거
            - 진로 방향 제안
            
            분석은 한국어로 작성하고, 전문적이면서도 이해하기 쉽게 설명해주세요.
            JSON 형식으로 응답해주세요.
            """)
    String analyzeCareer(@UserMessage String conversationHistory, @V("analysisType") String analysisType);
}

