package com.dreampath.domain.profile.controller;

import com.dreampath.domain.profile.entity.ProfileVector;
import com.dreampath.domain.profile.repository.ProfileVectorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/vector")
@RequiredArgsConstructor
public class VectorStatusController {

    private final ProfileVectorRepository vectorRepo;

    @GetMapping("/status/{profileId}")
    public ResponseEntity<Map<String, Object>> getVectorStatus(@PathVariable Long profileId) {
        ProfileVector vector = vectorRepo.findByProfileId(profileId);

        Map<String, Object> response = new HashMap<>();
        if (vector != null && vector.getVectorDbId() != null) {
            response.put("vectorId", vector.getVectorDbId());
            response.put("ready", true);
        } else {
            response.put("vectorId", null);
            response.put("ready", false);
        }

        return ResponseEntity.ok(response);
    }
}
