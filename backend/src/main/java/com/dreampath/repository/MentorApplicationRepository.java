package com.dreampath.repository;

import com.dreampath.entity.MentorApplication;
import com.dreampath.entity.User;
import com.dreampath.enums.MentorApplicationStatus;
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
