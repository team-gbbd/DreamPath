package com.dreampath.domain.career.controller;

import com.dreampath.domain.career.dto.JobDetailResponse;
import com.dreampath.domain.career.service.CareerDetailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/job")
public class JobDetailController {

    private final CareerDetailService careerDetailService;

    @GetMapping("/{id}/details")
    public ResponseEntity<JobDetailResponse> getJobDetail(@PathVariable("id") String rawJobId) {
        Long jobId = parseIdentifier(rawJobId);
        return ResponseEntity.ok(careerDetailService.getJobDetail(jobId));
    }

    private Long parseIdentifier(String rawId) {
        if (rawId == null || rawId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "직업 ID가 필요합니다.");
        }
        String sanitized = rawId.replaceAll("[^0-9]", "");
        if (sanitized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "직업 ID 형식이 올바르지 않습니다.");
        }
        try {
            return Long.parseLong(sanitized);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "직업 ID를 숫자로 변환할 수 없습니다.");
        }
    }
}
