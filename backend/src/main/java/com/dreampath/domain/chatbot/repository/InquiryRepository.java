package com.dreampath.domain.chatbot.repository;

import com.dreampath.domain.chatbot.entity.Inquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    // 생성일 기준 내림차순 정렬 (최신순)
    List<Inquiry> findAllByOrderByCreatedAtDesc();
}
