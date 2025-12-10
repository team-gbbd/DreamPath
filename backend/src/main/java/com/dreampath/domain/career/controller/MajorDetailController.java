package com.dreampath.domain.career.controller;

import com.dreampath.domain.career.dto.MajorDetailResponse;
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
@RequestMapping("/api/major")
public class MajorDetailController {

    private final CareerDetailService careerDetailService;

    @GetMapping("/{id}/details")
    public ResponseEntity<MajorDetailResponse> getMajorDetail(@PathVariable("id") String rawMajorId) {
        Long majorId = parseIdentifier(rawMajorId);
        return ResponseEntity.ok(careerDetailService.getMajorDetail(majorId));
    }

    private Long parseIdentifier(String rawId) {
        if (rawId == null || rawId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학과 ID가 필요합니다.");
        }
        String sanitized = rawId.replaceAll("[^0-9]", "");
        if (sanitized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학과 ID 형식이 올바르지 않습니다.");
        }
        try {
            return Long.parseLong(sanitized);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학과 ID를 숫자로 변환할 수 없습니다.");
        }
    }
}
