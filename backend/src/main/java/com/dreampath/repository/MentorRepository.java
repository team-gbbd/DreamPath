package com.dreampath.repository;

import com.dreampath.entity.Mentor;
import com.dreampath.entity.User;
import com.dreampath.enums.MentorStatus;
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
