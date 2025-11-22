package com.dreampath.repository.chatbot;

import com.dreampath.entity.chatbot.Faq;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface FaqRepository extends JpaRepository<Faq, Long> {

    @Query(value = """
        SELECT answer FROM faq 
        WHERE LOWER(question) LIKE LOWER(CONCAT('%', :q, '%'))
        LIMIT 1
    """, nativeQuery = true)
    String findSimilarAnswer(@Param("q") String question);
}
