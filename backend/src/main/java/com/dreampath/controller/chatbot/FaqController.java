package com.dreampath.controller.chatbot;

import com.dreampath.entity.chatbot.Faq;
import com.dreampath.repository.chatbot.FaqRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
}

