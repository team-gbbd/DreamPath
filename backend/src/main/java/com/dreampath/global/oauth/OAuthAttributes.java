package com.dreampath.global.oauth;

import java.util.Map;

public record OAuthAttributes(
        String provider,
        String providerId,
        String email,
        String name) {

    public static OAuthAttributes of(String registrationId, Map<String, Object> attributes) {
        return switch (registrationId.toLowerCase()) {
            case "kakao" -> ofKakao(attributes);
            case "naver" -> ofNaver(attributes);
            case "google" -> ofGoogle(attributes);
            default -> throw new IllegalArgumentException("지원하지 않는 OAuth 제공자입니다: " + registrationId);
        };
    }

    private static OAuthAttributes ofGoogle(Map<String, Object> attributes) {
        String email = (String) attributes.get("email");
        String name = (String) attributes.getOrDefault("name", "");
        String sub = (String) attributes.get("sub");
        return new OAuthAttributes("google", sub, email, name);
    }

    private static OAuthAttributes ofKakao(Map<String, Object> attributes) {
        Map<String, Object> account = cast(attributes.get("kakao_account"));
        Map<String, Object> profile = account != null ? cast(account.get("profile")) : null;
        String email = account != null ? (String) account.get("email") : null;
        String nickname = profile != null ? (String) profile.getOrDefault("nickname", "") : "";
        String id = String.valueOf(attributes.get("id"));
        return new OAuthAttributes("kakao", id, email, nickname);
    }

    private static OAuthAttributes ofNaver(Map<String, Object> attributes) {
        Map<String, Object> response = cast(attributes.get("response"));
        String email = response != null ? (String) response.get("email") : null;
        String name = response != null ? (String) response.getOrDefault("name", "") : "";
        String id = response != null ? (String) response.get("id") : null;
        return new OAuthAttributes("naver", id, email, name);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> cast(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return null;
    }
}
