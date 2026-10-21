package com.fanclash.api.chat.service;

import com.fanclash.api.chat.dto.*;
import com.fanclash.api.chat.entity.*;
import com.fanclash.api.chat.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final int  PAGE_SIZE = 50;
    private static final int  MAX_DISPLAY_NAME_LEN = 24;
    private static final String ADJECTIVES = "Cool,Fast,Bold,Bright,Wild,Sharp,Calm,Brave,Keen,Smart";
    private static final String[] ADJ = ADJECTIVES.split(",");

    private final ChatRoomRepository        roomRepo;
    private final ChatMessageRepository     messageRepo;
    private final ChatGuestTokenRepository  guestTokenRepo;
    private final ChatModerationLogRepository modLogRepo;
    private final ChatSseRegistry           sseRegistry;
    private final ChatRateLimiter           rateLimiter;
    private final ObjectMapper              objectMapper;

    // ── Guest token ──────────────────────────────────────────────────────────

    @Transactional
    public GuestTokenResponse issueGuestToken(String ipFingerprint) {
        String token = "chat_guest_" + UUID.randomUUID().toString().replace("-", "");
        String name  = generateDisplayName(token);

        ChatGuestToken entity = new ChatGuestToken();
        entity.setToken(token);
        entity.setDisplayName(name);
        entity.setIpFingerprint(hash(ipFingerprint));
        guestTokenRepo.save(entity);
        return new GuestTokenResponse(token, name);
    }

    private String generateDisplayName(String token) {
        int adjIdx = Math.abs(token.hashCode()) % ADJ.length;
        String suffix = token.substring(token.length() - 4).toUpperCase();
        return ADJ[adjIdx] + "Fan" + suffix;
    }

    // ── Room ─────────────────────────────────────────────────────────────────

    @Transactional
    public ChatRoom getOrCreateRoom(String eventSlug, Long seasonId) {
        String roomId = "event:" + eventSlug + ":season:" + seasonId;
        return roomRepo.findByRoomId(roomId)
                .orElseGet(() -> roomRepo.save(ChatRoom.create(roomId, eventSlug, seasonId)));
    }

    // ── History ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ChatHistoryResponse getHistory(String roomId, String before, String requestingToken) {
        PageRequest page = PageRequest.of(0, PAGE_SIZE + 1);
        List<ChatMessage> raw;
        if (before != null && !before.isBlank()) {
            Instant cursor = Instant.parse(before);
            raw = messageRepo.findBeforeByRoomId(roomId, cursor, page);
        } else {
            raw = messageRepo.findRecentByRoomId(roomId, page);
        }

        boolean hasMore = raw.size() > PAGE_SIZE;
        List<ChatMessage> msgs = hasMore ? raw.subList(0, PAGE_SIZE) : raw;

        // Return chronological order (oldest first) for display
        List<ChatMessageDto> dtos = msgs.stream()
                .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                .map(m -> toDto(m, requestingToken))
                .toList();

        String nextCursor = msgs.isEmpty() ? null
                : msgs.stream().map(ChatMessage::getCreatedAt).min(Instant::compareTo)
                        .map(Instant::toString).orElse(null);

        return new ChatHistoryResponse(roomId, dtos, hasMore, nextCursor);
    }

    // ── Send ─────────────────────────────────────────────────────────────────

    @Transactional
    public ChatMessageDto sendMessage(String roomId, SendMessageRequest req) {
        String token = req.guestToken();
        String text  = req.messageText().strip();

        if (text.isBlank() || text.length() > 500) {
            throw new IllegalArgumentException("Message text is invalid.");
        }

        ChatGuestToken guest = guestTokenRepo.findById(token)
                .orElseThrow(() -> new SecurityException("Unknown guest token."));

        if (guest.isBanned()) {
            throw new SecurityException("You are temporarily banned from chat.");
        }

        ChatRoom room = roomRepo.findByRoomId(roomId)
                .orElseThrow(() -> new IllegalStateException("Chat room not found."));

        if (room.isPaused()) {
            throw new IllegalStateException("Chat is currently paused.");
        }

        if (!rateLimiter.allow(token, roomId)) {
            throw new IllegalStateException("You're sending messages too fast. Please slow down.");
        }

        // Idempotency check
        if (req.idempotencyKey() != null && !req.idempotencyKey().isBlank()) {
            var existing = messageRepo.findByRoomIdAndIdempotencyKey(roomId, req.idempotencyKey());
            if (existing.isPresent()) {
                return toDto(existing.get(), token);
            }
        }

        ChatMessage msg = ChatMessage.create(roomId, token, guest.getDisplayName(),
                sanitize(text), req.idempotencyKey());
        msg = messageRepo.save(msg);

        guestTokenRepo.touchLastSeen(token, Instant.now());

        ChatMessageDto dto = toDto(msg, token);
        try {
            sseRegistry.broadcast(roomId, "message", objectMapper.writeValueAsString(dto));
        } catch (Exception e) {
            log.warn("SSE broadcast error for room {}: {}", roomId, e.getMessage());
        }
        return dto;
    }

    // ── Online count ─────────────────────────────────────────────────────────

    public int onlineCount(String roomId) {
        return sseRegistry.connectionCount(roomId);
    }

    // ── Moderation ───────────────────────────────────────────────────────────

    @Transactional
    public void deleteMessage(Long messageId, String moderator, String reason) {
        ChatMessage msg = messageRepo.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found."));
        msg.setDeletedAt(Instant.now());
        msg.setDeletedBy(moderator);
        messageRepo.save(msg);

        ChatModerationLog modLog = new ChatModerationLog();
        modLog.setRoomId(msg.getRoomId());
        modLog.setTargetToken(msg.getGuestToken());
        modLog.setAction("DELETE_MESSAGE");
        modLog.setMessageId(messageId);
        modLog.setModerator(moderator);
        modLog.setReason(reason);
        modLogRepo.save(modLog);

        try {
            sseRegistry.broadcast(msg.getRoomId(), "message_deleted",
                    "{\"id\":" + messageId + "}");
        } catch (Exception e) {
            log.warn("SSE broadcast error on delete: {}", e.getMessage());
        }
    }

    @Transactional
    public void banUser(String targetToken, Instant until, String moderator, String reason, String roomId) {
        ChatGuestToken guest = guestTokenRepo.findById(targetToken)
                .orElseThrow(() -> new IllegalArgumentException("Token not found."));
        guest.setBannedUntil(until);
        guestTokenRepo.save(guest);

        ChatModerationLog entry = new ChatModerationLog();
        entry.setRoomId(roomId);
        entry.setTargetToken(targetToken);
        entry.setAction(until == null ? "UNBAN" : "BAN");
        entry.setModerator(moderator);
        entry.setReason(reason);
        modLogRepo.save(entry);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private ChatMessageDto toDto(ChatMessage m, String requestingToken) {
        return new ChatMessageDto(
                m.getId(),
                m.getRoomId(),
                m.getDisplayName(),
                m.getMessageText(),
                m.getCreatedAt(),
                m.getGuestToken().equals(requestingToken)
        );
    }

    /** Strip HTML tags and null bytes — prevents XSS in message text. */
    private String sanitize(String input) {
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;")
                .replace("\u0000", "");
    }

    private String hash(String input) {
        if (input == null) return null;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes());
            return HexFormat.of().formatHex(digest).substring(0, 16);
        } catch (NoSuchAlgorithmException e) {
            return null;
        }
    }
}
