package com.dreampath.domain.mentoring.repository;

import com.dreampath.domain.mentoring.entity.Mentor;
import com.dreampath.domain.user.entity.User;
import com.dreampath.global.enums.MentorStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MentorRepository extends JpaRepository<Mentor, Long> {

    Optional<Mentor> findByUser(User user);

    boolean existsByUser(User user);

    List<Mentor> findByStatus(MentorStatus status);

    List<Mentor> findByStatusOrderByCreatedAtDesc(MentorStatus status);

    List<Mentor> findAllByOrderByCreatedAtDesc();
}
