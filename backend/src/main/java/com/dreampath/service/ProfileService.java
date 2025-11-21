package com.dreampath.service;

import com.dreampath.dto.VectorAnalyzeResponse;
import com.dreampath.entity.ProfileVector;
import com.dreampath.entity.UserProfile;
import com.dreampath.repository.ProfileVectorRepository;
import com.dreampath.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserProfileRepository profileRepository;
    private final ProfileVectorRepository profileVectorRepo;
    private final VectorClient vectorClient;

    @Transactional
    public UserProfile updateProfile(Long profileId, UserProfile newData) {

        UserProfile profile = profileRepository.findById(profileId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        profile.setPersonalityTraits(newData.getPersonalityTraits());
        profile.setValues(newData.getValues());
        profile.setEmotions(newData.getEmotions());
        profile.setInterests(newData.getInterests());

        profileRepository.save(profile);

        CompletableFuture.runAsync(() -> {
            String document = profile.toDocument();
            VectorAnalyzeResponse result = vectorClient.analyzeVector(profileId, document);

            ProfileVector pv = profileVectorRepo.findByProfileId(profileId);
            if (pv == null) {
                pv = new ProfileVector();
                pv.setProfileId(profileId);
            }

            pv.setVectorDbId(result.getVectorDbId());
            pv.setOriginalText(document);
            pv.setMetadata("{}");
            profileVectorRepo.save(pv);
        });

        return profile;
    }
}
