package com.dreampath.domain.mentoring.repository;

import com.dreampath.domain.mentoring.entity.MentorApplication;
import com.dreampath.domain.user.entity.User;
import com.dreampath.global.enums.MentorApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MentorApplicationRepository extends JpaRepository<MentorApplication, Long> {

    Optional<MentorApplication> findByUser(User user);

    List<MentorApplication> findByStatus(MentorApplicationStatus status);

    List<MentorApplication> findByStatusOrderByCreatedAtDesc(MentorApplicationStatus status);

    List<MentorApplication> findAllByOrderByCreatedAtDesc();
}
