package com.fanclash.api.chat.controller;

import com.fanclash.api.chat.dto.*;
import com.fanclash.api.chat.service.ChatService;
import com.fanclash.api.chat.service.ChatSseRegistry;
import com.fanclash.api.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Chat endpoints.
 *
 * GET  /api/chat/guest-token                      — issue a server-validated guest identity
 * GET  /api/chat/rooms/{roomId}/history           — paginated message history
 * POST /api/chat/rooms/{roomId}/messages          — send a message
 * GET  /api/chat/rooms/{roomId}/stream            — SSE stream for real-time messages
 * GET  /api/chat/rooms/{roomId}/online-count      — current connection count (estimate)
 *
 * Room IDs are opaque to clients. The frontend derives them as:
 *   "event:{eventSlug}:season:{seasonId}"
 * The backend validates and creates rooms on first access via POST messages or GET history.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService    chatService;
    private final ChatSseRegistry sseRegistry;

    /** Issue a server-validated guest token. Returns token + generated display name. */
    @PostMapping("/guest-token")
    public ResponseEntity<ApiResponse<GuestTokenResponse>> issueGuestToken(HttpServletRequest req) {
        String ip = extractIp(req);
        GuestTokenResponse resp = chatService.issueGuestToken(ip);
        return ResponseEntity.ok(ApiResponse.ok(resp));
    }

    /** Paginated history (newest first by default, ordered oldest-first in response). */
    @GetMapping("/rooms/{roomId}/history")
    public ResponseEntity<ApiResponse<ChatHistoryResponse>> getHistory(
            @PathVariable String roomId,
            @RequestParam(required = false) String before,
            @RequestParam(required = false) String guestToken) {
        ChatHistoryResponse resp = chatService.getHistory(roomId, before, guestToken);
        return ResponseEntity.ok(ApiResponse.ok(resp));
    }

    /** Send a message; persist then broadcast via SSE. */
    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<ChatMessageDto>> sendMessage(
            @PathVariable String roomId,
            @Valid @RequestBody SendMessageRequest req) {
        ChatMessageDto dto = chatService.sendMessage(roomId, req);
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    /** SSE subscription. Client receives "connected", "message", "message_deleted" events. */
    @GetMapping(value = "/rooms/{roomId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable String roomId) {
        return sseRegistry.subscribe(roomId);
    }

    /** Approximate online count for the room (active SSE connections). */
    @GetMapping("/rooms/{roomId}/online-count")
    public ResponseEntity<ApiResponse<Integer>> onlineCount(@PathVariable String roomId) {
        return ResponseEntity.ok(ApiResponse.ok(sseRegistry.connectionCount(roomId)));
    }

    private String extractIp(HttpServletRequest req) {
        String forwarded = req.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].strip();
        }
        return req.getRemoteAddr();
    }
}
