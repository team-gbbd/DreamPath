package com.dreampath.domain.mentoring.controller;

import com.dreampath.domain.user.dto.TokenRequest;
import com.dreampath.domain.user.dto.TokenResponse;
import com.dreampath.domain.mentoring.service.LiveKitService;
import jakarta.validation.Valid;
import livekit.LivekitModels;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/video")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3002", "http://192.168.123.100:3002"})
public class VideoController {

    private final LiveKitService liveKitService;

    @PostMapping("/token")
    public ResponseEntity<TokenResponse> getToken(@Valid @RequestBody TokenRequest request) {
        String token = liveKitService.createToken(request.getRoomName(), request.getParticipantName());
        String livekitUrl = liveKitService.getLivekitUrl();

        return ResponseEntity.ok(new TokenResponse(token, livekitUrl));
    }

    @GetMapping("/rooms")
    public ResponseEntity<List<Map<String, Object>>> getRooms() {
        List<LivekitModels.Room> rooms = liveKitService.listRooms();

        List<Map<String, Object>> roomList = rooms.stream()
                .map(room -> Map.<String, Object>of(
                        "name", room.getName(),
                        "sid", room.getSid(),
                        "numParticipants", room.getNumParticipants(),
                        "maxParticipants", room.getMaxParticipants(),
                        "creationTime", room.getCreationTime()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(roomList);
    }
}
