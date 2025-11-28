package com.dreampath.domain.learning.service;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * 직업명 → 학습 도메인 매핑 서비스
 * AI 추천 직업을 학습 경로 도메인으로 변환
 */
@Service
public class CareerToLearningDomainMapper {

    private final Map<String, String> careerToDomainMap;

    public CareerToLearningDomainMapper() {
        careerToDomainMap = new HashMap<>();
        initializeMapping();
    }

    /**
     * 직업 → 학습 도메인 매핑 초기화
     */
    private void initializeMapping() {
        // IT/개발 분야
        careerToDomainMap.put("프론트엔드 개발자", "프론트엔드 개발");
        careerToDomainMap.put("백엔드 개발자", "백엔드 개발");
        careerToDomainMap.put("풀스택 개발자", "풀스택 개발");
        careerToDomainMap.put("모바일 앱 개발자", "모바일 앱 개발");
        careerToDomainMap.put("데이터 사이언티스트", "데이터 사이언스");
        careerToDomainMap.put("데이터 분석가", "데이터 분석");
        careerToDomainMap.put("AI 엔지니어", "인공지능/머신러닝");
        careerToDomainMap.put("머신러닝 엔지니어", "인공지능/머신러닝");
        careerToDomainMap.put("DevOps 엔지니어", "DevOps/인프라");
        careerToDomainMap.put("클라우드 엔지니어", "클라우드 컴퓨팅");
        careerToDomainMap.put("보안 전문가", "정보보안");
        careerToDomainMap.put("게임 개발자", "게임 개발");
        careerToDomainMap.put("UI/UX 디자이너", "UI/UX 디자인");
        careerToDomainMap.put("웹 개발자", "웹 개발");
        careerToDomainMap.put("소프트웨어 엔지니어", "소프트웨어 공학");

        // 디자인 분야
        careerToDomainMap.put("그래픽 디자이너", "그래픽 디자인");
        careerToDomainMap.put("제품 디자이너", "제품 디자인");
        careerToDomainMap.put("영상 편집자", "영상 편집");
        careerToDomainMap.put("3D 디자이너", "3D 모델링");

        // 비즈니스 분야
        careerToDomainMap.put("프로젝트 매니저", "프로젝트 관리");
        careerToDomainMap.put("제품 매니저", "제품 관리");
        careerToDomainMap.put("마케팅 전문가", "디지털 마케팅");
        careerToDomainMap.put("기획자", "비즈니스 기획");
        careerToDomainMap.put("컨설턴트", "경영 컨설팅");

        // 콘텐츠 분야
        careerToDomainMap.put("작가", "글쓰기");
        careerToDomainMap.put("콘텐츠 크리에이터", "콘텐츠 제작");
        careerToDomainMap.put("유튜버", "영상 콘텐츠 제작");

        // 기타
        careerToDomainMap.put("교육자", "교육/강의");
        careerToDomainMap.put("연구원", "연구 방법론");
    }

    /**
     * 직업명을 학습 도메인으로 변환
     *
     * @param careerName AI가 추천한 직업명
     * @return 학습 도메인명
     */
    public String mapCareerToDomain(String careerName) {
        // 정확한 매칭
        if (careerToDomainMap.containsKey(careerName)) {
            return careerToDomainMap.get(careerName);
        }

        // 부분 매칭 (예: "프론트엔드" 포함하면 "프론트엔드 개발")
        for (Map.Entry<String, String> entry : careerToDomainMap.entrySet()) {
            if (careerName.contains(entry.getKey()) || entry.getKey().contains(careerName)) {
                return entry.getValue();
            }
        }

        // 키워드 기반 매칭
        if (careerName.contains("개발") || careerName.contains("프로그래머") || careerName.contains("엔지니어")) {
            if (careerName.contains("프론트") || careerName.contains("웹")) {
                return "프론트엔드 개발";
            } else if (careerName.contains("백엔드") || careerName.contains("서버")) {
                return "백엔드 개발";
            } else if (careerName.contains("앱") || careerName.contains("모바일")) {
                return "모바일 앱 개발";
            } else {
                return "소프트웨어 공학";
            }
        }

        if (careerName.contains("데이터")) {
            if (careerName.contains("과학") || careerName.contains("사이언스")) {
                return "데이터 사이언스";
            } else {
                return "데이터 분석";
            }
        }

        if (careerName.contains("AI") || careerName.contains("인공지능") || careerName.contains("머신러닝")) {
            return "인공지능/머신러닝";
        }

        if (careerName.contains("디자인")) {
            if (careerName.contains("UI") || careerName.contains("UX")) {
                return "UI/UX 디자인";
            } else {
                return "그래픽 디자인";
            }
        }

        // 기본값: 직업명 그대로 사용
        return careerName;
    }

    /**
     * 새로운 매핑 추가 (동적 확장 가능)
     */
    public void addMapping(String careerName, String domain) {
        careerToDomainMap.put(careerName, domain);
    }
}
