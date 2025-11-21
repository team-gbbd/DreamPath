package com.dreampath.repository;

import com.dreampath.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

    Optional<UserProfile> findByUser_UserId(Long userId);
    // deleteById(Long id) 는 JpaRepository 기본 제공 메서드를 사용합니다.
}
