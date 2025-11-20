package com.dreampath.service;

import com.dreampath.dto.VectorAnalyzeResponse;
import com.dreampath.entity.ProfileVector;
import com.dreampath.repository.ProfileVectorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProfileVectorService {

    private final VectorClient vectorClient;
    private final ProfileVectorRepository vectorRepo;

    @Transactional
    public ProfileVector generateVector(Long profileId, String document) {

        VectorAnalyzeResponse result = vectorClient.analyzeVector(profileId, document);

        ProfileVector pv = vectorRepo.findByProfileId(profileId);
        if (pv == null) {
            pv = new ProfileVector();
            pv.setProfileId(profileId);
        }
        pv.setVectorDbId(result.getVectorDbId());
        pv.setOriginalText(document);
        pv.setMetadata("{}");
        return vectorRepo.save(pv);
    }
}
