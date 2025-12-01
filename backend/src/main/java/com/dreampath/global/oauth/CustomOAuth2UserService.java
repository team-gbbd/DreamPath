package com.dreampath.global.oauth;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        OAuthAttributes attributes = OAuthAttributes.of(
                userRequest.getClientRegistration().getRegistrationId(),
                oAuth2User.getAttributes()
        );

        return new CustomOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                oAuth2User.getAttributes(),
                attributes
        );
    }
}
