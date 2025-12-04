package com.dreampath.domain.profile.controller;

import com.dreampath.domain.profile.entity.ProfileVector;
import com.dreampath.domain.profile.repository.ProfileVectorRepository;
import com.dreampath.domain.profile.service.ProfileVectorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/vector")
public class VectorRegenerateController {

    private final ProfileVectorService vectorService;
    private final ProfileVectorRepository vectorRepository;

    @PostMapping("/regenerate/{profileId}")
    public String regenerate(@PathVariable Long profileId) {

        ProfileVector vector = vectorRepository.findByProfileId(profileId);
        if (vector == null || vector.getOriginalText() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "재생성할 원본 문서를 찾을 수 없습니다.");
        }

        vectorService.generateVector(profileId, vector.getOriginalText());
        return "OK";
    }
}
