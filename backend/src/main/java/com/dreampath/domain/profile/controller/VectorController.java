package com.dreampath.domain.profile.controller;

import com.dreampath.domain.profile.entity.ProfileVector;
import com.dreampath.domain.profile.service.ProfileVectorService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/vector")
public class VectorController {

    private final ProfileVectorService vectorService;

    @PostMapping("/generate/{profileId}")
    public ProfileVector generate(@PathVariable Long profileId, @RequestBody String document) {
        return vectorService.generateVector(profileId, document);
    }
}
