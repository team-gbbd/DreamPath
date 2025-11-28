package com.dreampath.domain.mentoring.repository;

import com.dreampath.domain.mentoring.entity.MentorApprovalLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MentorApprovalLogRepository extends JpaRepository<MentorApprovalLog, Long> {

    List<MentorApprovalLog> findByMentor_MentorIdOrderByCreatedAtDesc(Long mentorId);
}
