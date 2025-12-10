package com.dreampath.domain.career.repository;

import com.dreampath.domain.career.entity.JobDetail;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobDetailRepository extends JpaRepository<JobDetail, Long> {
}

