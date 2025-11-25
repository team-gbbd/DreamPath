package com.dreampath.controller.chatbot;

import com.dreampath.entity.chatbot.Faq;
import com.dreampath.repository.chatbot.FaqRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/faq")
@RequiredArgsConstructor
public class FaqController {

    private final FaqRepository faqRepository;

    @GetMapping("/all")
    public List<Faq> getAllFaq() {
        return faqRepository.findAll();
    }

    @GetMapping("/category")
    public List<Faq> getFaqByCategory(@RequestParam String name) {
        return faqRepository.findByCategory(name);
    }

    @PostMapping("/init")
    public Map<String, Object> initializeFaqData() {
        // 기존 데이터 확인
        long count = faqRepository.count();
        if (count > 0) {
            return Map.of(
                "success", false,
                "message", "FAQ 데이터가 이미 존재합니다. (" + count + "개)",
                "count", count
            );
        }

        List<Faq> faqs = new ArrayList<>();

        // 1. 계정 / 로그인 관련
        faqs.add(createFaq("계정 / 로그인 관련", "회원가입은 어떻게 하나요?", "상단 메뉴의 \"회원가입\" 버튼을 클릭하여 이메일과 비밀번호를 입력하면 가입할 수 있습니다. Google, Kakao, Naver 소셜 로그인도 지원합니다."));
        faqs.add(createFaq("계정 / 로그인 관련", "비밀번호를 잊어버렸어요", "로그인 페이지의 \"비밀번호 찾기\"를 클릭하여 가입한 이메일로 재설정 링크를 받을 수 있습니다."));
        faqs.add(createFaq("계정 / 로그인 관련", "로그인이 안돼요", "이메일과 비밀번호를 다시 확인해주세요. 문제가 계속되면 브라우저 캐시를 삭제하거나 다른 브라우저를 사용해보세요."));

        // 2. 프로필 / 사용자 정보
        faqs.add(createFaq("프로필 / 사용자 정보", "프로필 정보를 수정하려면?", "마이페이지에서 \"프로필 수정\" 버튼을 클릭하여 이름, 학교, 학년 등의 정보를 변경할 수 있습니다."));
        faqs.add(createFaq("프로필 / 사용자 정보", "프로필 사진은 어떻게 변경하나요?", "마이페이지의 프로필 사진을 클릭하면 새로운 이미지를 업로드할 수 있습니다."));
        faqs.add(createFaq("프로필 / 사용자 정보", "회원 탈퇴는 어떻게 하나요?", "마이페이지 하단의 \"회원 탈퇴\" 버튼을 통해 탈퇴할 수 있습니다. 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다."));

        // 3. 진로 추천 / 본석 관련
        faqs.add(createFaq("진로 추천 / 본석 관련", "AI 진로 분석은 어떻게 받나요?", "상단 메뉴의 \"진로 상담\"을 클릭하여 AI와 대화하면 진로 정체성 분석을 받을 수 있습니다."));
        faqs.add(createFaq("진로 추천 / 본석 관련", "진로 분석 결과는 어디서 볼 수 있나요?", "마이페이지의 \"진로 분석 결과\" 섹션에서 이전 분석 내역을 확인할 수 있습니다."));
        faqs.add(createFaq("진로 추천 / 본석 관련", "추천받은 진로가 마음에 안 들어요", "AI 진로 상담을 다시 진행하거나, 설문조사 내용을 수정하여 더 정확한 분석을 받아보세요."));
        faqs.add(createFaq("진로 추천 / 본석 관련", "진로 분석은 몇 번이나 받을 수 있나요?", "제한 없이 원하는 만큼 진로 상담과 분석을 받을 수 있습니다."));

        // 4. AI 문의 챗봇 관련
        faqs.add(createFaq("AI 문의 챗봇 관련", "AI 챗봇이 응답하지 않아요", "네트워크 연결을 확인하고 페이지를 새로고침해보세요. 문제가 계속되면 고객센터로 문의해주세요."));
        faqs.add(createFaq("AI 문의 챗봇 관련", "챗봇 대화 내역은 저장되나요?", "네, 모든 대화 내역은 자동으로 저장되며 마이페이지에서 확인할 수 있습니다."));
        faqs.add(createFaq("AI 문의 챗봇 관련", "챗봇과의 대화를 삭제하고 싶어요", "마이페이지의 대화 내역에서 개별 대화를 삭제할 수 있습니다."));

        // 5. 기술 문제
        faqs.add(createFaq("기술 문제", "페이지가 느려요", "브라우저 캐시를 삭제하거나 Chrome, Edge 등 최신 브라우저를 사용해보세요."));
        faqs.add(createFaq("기술 문제", "화면이 제대로 표시되지 않아요", "F5 키로 새로고침하거나 브라우저 확대/축소 배율을 100%로 설정해보세요."));
        faqs.add(createFaq("기술 문제", "모바일에서 이용할 수 있나요?", "네, DreamPath는 모바일 브라우저에서도 이용 가능하며 반응형으로 최적화되어 있습니다."));

        // 6. 기타 문의
        faqs.add(createFaq("기타 문의", "DreamPath는 어떤 서비스인가요?", "DreamPath는 AI 기반 진로 상담 및 분석 서비스입니다. 학생들이 자신의 진로 정체성을 발견하고 적합한 진로를 찾도록 돕습니다."));
        faqs.add(createFaq("기타 문의", "서비스 이용료가 있나요?", "현재 DreamPath의 모든 기본 기능은 무료로 제공됩니다."));
        faqs.add(createFaq("기타 문의", "고객센터 연락처는?", "이메일: support@dreampath.com | 운영시간: 평일 09:00-18:00"));

        faqRepository.saveAll(faqs);

        return Map.of(
            "success", true,
            "message", "FAQ 데이터가 성공적으로 초기화되었습니다.",
            "count", faqs.size()
        );
    }

    private Faq createFaq(String category, String question, String answer) {
        Faq faq = new Faq();
        faq.setCategory(category);
        faq.setQuestion(question);
        faq.setAnswer(answer);
        faq.setUpdatedAt(LocalDateTime.now());
        return faq;
    }
}

