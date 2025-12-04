package com.dreampath.domain.chatbot.repository;

import com.dreampath.domain.chatbot.entity.Inquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    // 최신 순으로 모든 문의 조회
    List<Inquiry> findAllByOrderByCreatedAtDesc();
}
