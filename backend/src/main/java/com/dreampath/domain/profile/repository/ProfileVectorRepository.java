package com.dreampath.domain.profile.repository;

import com.dreampath.domain.profile.entity.ProfileVector;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileVectorRepository extends JpaRepository<ProfileVector, Long> {

    ProfileVector findByProfileId(Long profileId);

}
