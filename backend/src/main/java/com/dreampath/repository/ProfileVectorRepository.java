package com.dreampath.repository;

import com.dreampath.entity.ProfileVector;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileVectorRepository extends JpaRepository<ProfileVector, Long> {

    ProfileVector findByProfileId(Long profileId);

}
