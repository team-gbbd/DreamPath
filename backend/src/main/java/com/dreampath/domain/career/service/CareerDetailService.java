package com.dreampath.domain.career.service;

import com.dreampath.domain.career.dto.JobDetailResponse;
import com.dreampath.domain.career.dto.MajorDetailResponse;
import com.dreampath.domain.career.repository.JobDetailRepository;
import com.dreampath.domain.career.repository.MajorDetailRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CareerDetailService {

    private final JobDetailRepository jobDetailRepository;
    private final MajorDetailRepository majorDetailRepository;
    private final ObjectMapper objectMapper;

    public JobDetailResponse getJobDetail(Long jobId) {
        return jobDetailRepository.findById(jobId)
                .map(entity -> JobDetailResponse.from(entity, objectMapper))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job detail not found"));
    }

    public MajorDetailResponse getMajorDetail(Long majorId) {
        return majorDetailRepository.findById(majorId)
                .map(entity -> MajorDetailResponse.from(entity, objectMapper))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Major detail not found"));
    }
}
