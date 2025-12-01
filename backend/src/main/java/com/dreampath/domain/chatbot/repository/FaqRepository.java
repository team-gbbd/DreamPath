package com.dreampath.domain.chatbot.repository;

import com.dreampath.domain.chatbot.entity.Faq;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FaqRepository extends JpaRepository<Faq, Long> {

    // 카테고리별 FAQ 조회
    List<Faq> findByCategory(String category);
}
