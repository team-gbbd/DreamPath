package com.dreampath.controller;

import com.dreampath.dto.ProfileRequest;
import com.dreampath.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import org.springframework.dao.DuplicateKeyException;
import jakarta.validation.Valid;

@RestController
@RequestMapping({"/api/profiles", "/api/profile"})
@RequiredArgsConstructor
public class ProfileController {

    private final UserProfileService profileService;

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody ProfileRequest req) {
        return ResponseEntity.ok(profileService.createProfile(req));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> get(@PathVariable Long userId) {
        return ResponseEntity.ok(profileService.getProfile(userId));
    }

    @PutMapping("/{profileId}")
    public ResponseEntity<?> update(@PathVariable Long profileId,
                                    @Valid @RequestBody ProfileRequest req) {
        return ResponseEntity.ok(profileService.updateProfile(profileId, req));
    }

    @PatchMapping("/{profileId}")
    public ResponseEntity<?> patch(@PathVariable Long profileId,
                                   @RequestBody Map<String, Object> fields) {
        return ResponseEntity.ok(profileService.partialUpdate(profileId, fields));
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<?> handleDuplicate(DuplicateKeyException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }
}
