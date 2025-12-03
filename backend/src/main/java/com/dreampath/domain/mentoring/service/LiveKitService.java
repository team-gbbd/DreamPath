package com.dreampath.domain.mentoring.service;

import io.livekit.server.AccessToken;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;
import io.livekit.server.RoomServiceClient;
import livekit.LivekitModels;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import retrofit2.Call;

import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.ArrayList;

@Service
public class LiveKitService {

    @Value("${livekit.api.key}")
    private String apiKey;

    @Value("${livekit.api.secret}")
    private String apiSecret;

    @Value("${livekit.url}")
    private String livekitUrl;

    private RoomServiceClient roomServiceClient;

    @PostConstruct
    public void init() {
        roomServiceClient = RoomServiceClient.createClient(livekitUrl, apiKey, apiSecret);
    }

    public String createToken(String roomName, String participantName, String participantIdentity) {
        AccessToken token = new AccessToken(apiKey, apiSecret);

        token.setName(participantName);  // 표시용 이름
        token.setIdentity(participantIdentity);  // 고유 식별자
        token.setTtl(6 * 60 * 60 * 1000L); // 6시간 (밀리초)

        token.addGrants(new RoomJoin(true), new RoomName(roomName));

        return token.toJwt();
    }

    // 하위 호환성을 위한 오버로드 (identity = name)
    public String createToken(String roomName, String participantName) {
        return createToken(roomName, participantName, participantName);
    }

    public String getLivekitUrl() {
        return livekitUrl;
    }

    public List<LivekitModels.Room> listRooms() {
        try {
            Call<List<LivekitModels.Room>> call = roomServiceClient.listRooms();
            List<LivekitModels.Room> rooms = call.execute().body();
            return rooms != null ? rooms : new ArrayList<>();
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
}
