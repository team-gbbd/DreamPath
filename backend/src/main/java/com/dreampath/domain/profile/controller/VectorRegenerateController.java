package com.dreampath.domain.profile.controller;

import com.dreampath.domain.profile.entity.UserProfile;
import com.dreampath.domain.profile.repository.UserProfileRepository;
import com.dreampath.domain.profile.service.ProfileVectorService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/vector")
public class VectorRegenerateController {

    private final ProfileVectorService vectorService;
    private final UserProfileRepository profileRepo;

    @PostMapping("/regenerate/{profileId}")
    public String regenerate(@PathVariable Long profileId) {

        UserProfile profile = profileRepo.findById(profileId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        String doc = profile.toDocument();
        vectorService.generateVector(profileId, doc);

        return "OK";
    }
}
