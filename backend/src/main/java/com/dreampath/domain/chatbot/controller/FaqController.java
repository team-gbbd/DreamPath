package com.dreampath.domain.chatbot.controller;

import com.dreampath.domain.chatbot.entity.Faq;
import com.dreampath.domain.chatbot.repository.FaqRepository;
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
        faqs.add(createFaq("계정 / 로그인 관련", "비밀번호를 까먹었어요. 어떻게 재설정하나요?", "로그인 화면에서 '비밀번호 재설정' 버튼을 눌러 이메일 인증을 진행하면 새 비밀번호를 설정할 수 있어요."));
        faqs.add(createFaq("계정 / 로그인 관련", "회원가입 이메일 인증이 오지 않아요.", "스팸함 또는 프로모션함을 확인해주세요. 그래도 안 오면 이메일 주소가 정확한지 다시 확인해주세요."));
        faqs.add(createFaq("계정 / 로그인 관련", "회원을 탈퇴하고 싶어요.", "마이페이지 → 회원 탈퇴에서 진행할 수 있어요."));

        // 2. 프로필 / 사용자 정보
        faqs.add(createFaq("프로필 / 사용자 정보", "이름 또는 정보를 수정하고 싶어요.", "마이페이지 → 개인정보 수정에서 언제든지 수정할 수 있어요."));
        faqs.add(createFaq("프로필 / 사용자 정보", "내가 제출한 성향 분석 결과는 어디에서 보나요?", "마이페이지 → 분석 기록에서 확인할 수 있어요."));

        // 3. 진로 추천 / 분석 관련
        faqs.add(createFaq("진로 추천 / 분석 관련", "진로 추천 결과를 더 자세히 보고 싶어요.", "추천 직업을 클릭하면 상세 설명을 볼 수 있어요."));
        faqs.add(createFaq("진로 추천 / 분석 관련", "진로 추천이 마음에 들지 않아요. 다시 분석할 수 있나요?", "당연히 가능해요! 새 분석 시작을 눌러 다시 진행하세요."));
        faqs.add(createFaq("진로 추천 / 분석 관련", "추천 알고리즘은 어떻게 작동하나요?", "사용자의 성향, 대화 히스토리, 벡터 기반 유사도, 공공데이터를 사용해 직업을 추천해요."));

        // 4. AI 문의 챗봇 관련
        faqs.add(createFaq("AI 문의 챗봇 관련", "챗봇이 잘못된 답변을 하면 어떻게 하나요?", "메인페이지 하단 문의하기를 통해 문의를 남겨주세요."));

        // 5. 기술적 문제
        faqs.add(createFaq("기술적 문제", "페이지가 깨지거나 일부 기능이 동작하지 않아요.", "브라우저 새로고침(F5) 또는 캐시 삭제 후 다시 시도해보세요."));
        faqs.add(createFaq("기술적 문제", "오류가 계속 발생해요. 어디에 문의하나요?", "메인페이지 하단 문의하기를 통해 문의를 남겨주세요."));

        // 6. 기타 문의
        faqs.add(createFaq("기타 문의", "서비스는 무료인가요?", "전문가와 화상통화 기능은 유료 제공, 이외 기능은 무료로 제공돼요."));
        faqs.add(createFaq("기타 문의", "내 데이터는 안전하게 보관되나요?", "모든 개인정보는 암호화되어 저장되며 외부로 유출되지 않아요."));
        faqs.add(createFaq("기타 문의", "PDF 리포트는 어디에서 다운로드하나요?", "진로 리포트 페이지에서 'PDF 저장' 버튼을 누르면 즉시 다운로드할 수 있어요."));

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

