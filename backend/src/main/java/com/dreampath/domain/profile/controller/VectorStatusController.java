package com.dreampath.domain.profile.controller;

import com.dreampath.domain.profile.entity.ProfileVector;
import com.dreampath.domain.profile.repository.ProfileVectorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/vector")
public class VectorStatusController {

    private final ProfileVectorRepository repo;

    @GetMapping("/status/{profileId}")
    public ProfileVector getStatus(@PathVariable Long profileId) {
        return repo.findByProfileId(profileId);
    }
}
