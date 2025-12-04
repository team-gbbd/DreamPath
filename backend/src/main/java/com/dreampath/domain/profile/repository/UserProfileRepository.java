package com.dreampath.domain.profile.repository;

import com.dreampath.domain.profile.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * UserProfile Repository
 * 
 * 주의: 문서 조회 전용 Repository입니다.
 * 입력 폼 기반 CRUD 기능은 제공하지 않습니다.
 */
@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

    /**
     * userId로 프로필 조회
     */
    Optional<UserProfile> findByUserId(Long userId);

    /**
     * userId로 프로필 존재 여부 확인
     */
    boolean existsByUserId(Long userId);
}
