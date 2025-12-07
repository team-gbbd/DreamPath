package com.dreampath.domain.profile.dto;

import com.dreampath.domain.profile.entity.UserProfile;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Builder
public class UserProfileResponse {

    private final Long profileId;
    private final Long userId;
    private final String personality;
    private final String values;
    private final String emotions;
    private final String interests;
    private final Map<String, Object> metadata;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public static UserProfileResponse from(UserProfile profile) {
        return UserProfileResponse.builder()
                .profileId(profile.getProfileId())
                .userId(profile.getUserId())
                .personality(profile.getPersonality())
                .values(profile.getValues())
                .emotions(profile.getEmotions())
                .interests(profile.getInterests())
                .metadata(profile.getMetadata())
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}
