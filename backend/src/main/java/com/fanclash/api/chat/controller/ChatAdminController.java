package com.fanclash.api.chat.controller;

import com.fanclash.api.chat.service.ChatService;
import com.fanclash.api.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Admin moderation endpoints for chat.
 * All routes under /api/admin/** are protected by AdminAuthInterceptor (X-Admin-Secret header).
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/chat")
public class ChatAdminController {

    private final ChatService chatService;

    public record DeleteMessageRequest(String reason) {}
    public record BanUserRequest(String targetToken, String roomId, int durationMinutes, String reason) {}

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<ApiResponse<Void>> deleteMessage(
            @PathVariable Long messageId,
            @RequestBody(required = false) DeleteMessageRequest req) {
        chatService.deleteMessage(messageId, "admin", req != null ? req.reason() : null);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/ban")
    public ResponseEntity<ApiResponse<Void>> banUser(@RequestBody BanUserRequest req) {
        Instant until = req.durationMinutes() > 0
                ? Instant.now().plus(req.durationMinutes(), ChronoUnit.MINUTES)
                : null; // null = unban
        chatService.banUser(req.targetToken(), until, "admin", req.reason(), req.roomId());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
