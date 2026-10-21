package com.fanclash.api.chat.service;

import com.fanclash.api.chat.dto.*;
import com.fanclash.api.chat.entity.*;
import com.fanclash.api.chat.moderation.ContentModerationService;
import com.fanclash.api.chat.moderation.ModerationDecision;
import com.fanclash.api.chat.moderation.ModerationResult;
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
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final int  PAGE_SIZE = 50;
    private static final int  MAX_DISPLAY_NAME_LEN = 24;
    private static final int  MIN_DISPLAY_NAME_LEN = 3;
    private static final Pattern DISPLAY_NAME_PATTERN = Pattern.compile("^[A-Za-z0-9 _\\-]+$");
    private static final Set<String> RESERVED_NAMES = Set.of(
        "mod", "admin", "moderator", "system", "fanmeter", "bot", "official", "staff", "support"
    );
    private static final String ADJECTIVES = "Cool,Fast,Bold,Bright,Wild,Sharp,Calm,Brave,Keen,Smart";
    private static final String[] ADJ = ADJECTIVES.split(",");

    private final ChatRoomRepository        roomRepo;
    private final ChatMessageRepository     messageRepo;
    private final ChatGuestTokenRepository  guestTokenRepo;
    private final ChatModerationLogRepository modLogRepo;
    private final ChatReportRepository      reportRepo;
    private final ChatSseRegistry           sseRegistry;
    private final ChatRateLimiter           rateLimiter;
    private final ContentModerationService  contentModerator;
    private final RestrictionService        restrictionService;
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

    @Transactional
    public GuestTokenResponse updateDisplayName(String token, String requestedName) {
        String trimmed = requestedName.strip();
        validateDisplayName(trimmed);

        ChatGuestToken guest = guestTokenRepo.findById(token)
                .orElseThrow(() -> new SecurityException("Unknown guest token."));
        guest.setDisplayName(trimmed);
        guestTokenRepo.save(guest);
        return new GuestTokenResponse(token, trimmed);
    }

    private void validateDisplayName(String name) {
        if (name.length() < MIN_DISPLAY_NAME_LEN || name.length() > MAX_DISPLAY_NAME_LEN) {
            throw new IllegalArgumentException(
                    "Display name must be " + MIN_DISPLAY_NAME_LEN + "–" + MAX_DISPLAY_NAME_LEN + " characters.");
        }
        if (!DISPLAY_NAME_PATTERN.matcher(name).matches()) {
            throw new IllegalArgumentException(
                    "Display name may only contain letters, numbers, spaces, underscores, and hyphens.");
        }
        String lower = name.toLowerCase().replaceAll("[^a-z]", "");
        if (RESERVED_NAMES.contains(lower)) {
            throw new IllegalArgumentException("That name is reserved. Please choose a different name.");
        }
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

    // ── Send (with moderation pipeline) ──────────────────────────────────────

    @Transactional
    public SendMessageResponse sendMessage(String roomId, SendMessageRequest req) {
        String token = req.guestToken();
        String text  = req.messageText().strip();

        if (text.isBlank() || text.length() > 500) {
            throw new IllegalArgumentException("Message text is invalid.");
        }

        // 1. Validate guest token
        ChatGuestToken guest = guestTokenRepo.findById(token)
                .orElseThrow(() -> new SecurityException("Unknown guest token."));

        // 2. Check active restrictions (replaces old isBanned check)
        Optional<ChatRestriction> active = restrictionService.findActiveRestriction(token, roomId);
        if (active.isPresent()) {
            ChatRestriction r = active.get();
            if (r.getRestrictionType() == ChatRestriction.RestrictionType.PERMANENT_BAN) {
                return SendMessageResponse.banned();
            }
            // TIMEOUT
            long expiresEpoch = r.getExpiresAt() != null ? r.getExpiresAt().getEpochSecond() : 0;
            return SendMessageResponse.timedOut(expiresEpoch);
        }

        // 3. Legacy bannedUntil check for backwards compat
        if (guest.isBanned()) {
            return SendMessageResponse.banned();
        }

        // 4. Get or create room
        ChatRoom room = roomRepo.findByRoomId(roomId)
                .orElseGet(() -> roomRepo.save(ChatRoom.create(roomId, roomId, null)));

        if (room.isPaused()) {
            throw new IllegalStateException("Chat is currently paused.");
        }

        // 5. Rate limit
        if (!rateLimiter.allow(token, roomId)) {
            throw new IllegalStateException("You're sending messages too fast. Please slow down.");
        }

        // 6. Idempotency check
        if (req.idempotencyKey() != null && !req.idempotencyKey().isBlank()) {
            var existing = messageRepo.findByRoomIdAndIdempotencyKey(roomId, req.idempotencyKey());
            if (existing.isPresent()) {
                return SendMessageResponse.allowed(toDto(existing.get(), token));
            }
        }

        // 7. Content moderation
        String sanitized = sanitize(text);
        ModerationResult modResult;
        try {
            modResult = contentModerator.evaluate(sanitized);
        } catch (Exception e) {
            // Moderation service error → fail closed for safety: block and log
            log.error("Content moderation service error for room {}: {}", roomId, e.getMessage());
            return SendMessageResponse.blocked(
                    "Your message could not be sent due to a temporary system issue. Please try again.");
        }

        // 8. Handle moderation decision
        return switch (modResult.decision()) {
            case ALLOW -> {
                ChatMessageDto dto = persistAndBroadcast(roomId, token, guest, sanitized, req.idempotencyKey());
                guestTokenRepo.touchLastSeen(token, Instant.now());
                yield SendMessageResponse.allowed(dto);
            }
            case ALLOW_WITH_WARNING -> {
                ChatMessageDto dto = persistAndBroadcast(roomId, token, guest, sanitized, req.idempotencyKey());
                guestTokenRepo.touchLastSeen(token, Instant.now());
                restrictionService.enforceAfterViolation(token, roomId, modResult);
                yield SendMessageResponse.withWarning(dto,
                        "Please keep the chat respectful. Repeated violations may result in a timeout or ban.");
            }
            case BLOCK -> {
                restrictionService.enforceAfterViolation(token, roomId, modResult);
                yield SendMessageResponse.blocked(
                        "Your message could not be sent because it violates our community guidelines.");
            }
            case REVIEW -> {
                // Publish but queue for moderator review
                SavedMessage saved = persistAndBroadcastFull(roomId, token, guest, sanitized, req.idempotencyKey());
                guestTokenRepo.touchLastSeen(token, Instant.now());
                restrictionService.queueForReview(
                        saved.entity().getId(), roomId, modResult, ChatModQueueItem.Severity.MEDIUM);
                yield SendMessageResponse.allowed(saved.dto());
            }
            case RESTRICT_USER -> {
                Optional<ChatRestriction> restriction =
                        restrictionService.enforceAfterViolation(token, roomId, modResult);
                if (restriction.isPresent()
                        && restriction.get().getRestrictionType() == ChatRestriction.RestrictionType.PERMANENT_BAN) {
                    yield SendMessageResponse.banned();
                }
                long expiresEpoch = restriction
                        .map(r -> r.getExpiresAt() != null ? r.getExpiresAt().getEpochSecond() : 0L)
                        .orElse(0L);
                yield SendMessageResponse.timedOut(expiresEpoch);
            }
        };
    }

    private record SavedMessage(ChatMessage entity, ChatMessageDto dto) {}

    private ChatMessageDto persistAndBroadcast(String roomId, String token, ChatGuestToken guest,
                                               String sanitizedText, String idempotencyKey) {
        return persistAndBroadcastFull(roomId, token, guest, sanitizedText, idempotencyKey).dto();
    }

    private SavedMessage persistAndBroadcastFull(String roomId, String token, ChatGuestToken guest,
                                                  String sanitizedText, String idempotencyKey) {
        ChatMessage msg = ChatMessage.create(roomId, token, guest.getDisplayName(), sanitizedText, idempotencyKey);
        msg = messageRepo.save(msg);
        ChatMessageDto dto = toDto(msg, token);
        try {
            sseRegistry.broadcast(roomId, "message", objectMapper.writeValueAsString(dto));
        } catch (Exception e) {
            log.warn("SSE broadcast error for room {}: {}", roomId, e.getMessage());
        }
        return new SavedMessage(msg, dto);
    }

    // ── Online count ─────────────────────────────────────────────────────────

    public int onlineCount(String roomId) {
        return sseRegistry.connectionCount(roomId);
    }

    // ── User report ───────────────────────────────────────────────────────────

    @Transactional
    public void reportMessage(String roomId, Long messageId, ReportMessageRequest req) {
        String reporterToken = req.reporterToken();

        // Rate-limit: max 3 reports per hour per user
        Instant oneHourAgo = Instant.now().minus(1, java.time.temporal.ChronoUnit.HOURS);
        long recentCount = reportRepo.countRecentByReporter(reporterToken, oneHourAgo);
        if (recentCount >= 3) {
            throw new IllegalStateException("Report limit reached. Please wait before reporting again.");
        }

        // Deduplicate: one report per message per user
        if (reportRepo.findByMessageIdAndReporterToken(messageId, reporterToken).isPresent()) {
            return; // silently ignore duplicate
        }

        ChatMessage msg = messageRepo.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found."));

        ChatReport report = new ChatReport();
        report.setRoomId(roomId);
        report.setMessageId(messageId);
        report.setReporterToken(reporterToken);
        report.setReportedToken(msg.getGuestToken());
        report.setCategory(req.category());

        // Elevate priority for severe categories
        report.setPriority(switch (req.category()) {
            case THREAT, SEXUAL_CONTENT -> ChatReport.Priority.CRITICAL;
            case HATE_SPEECH, PRIVATE_INFO -> ChatReport.Priority.HIGH;
            default -> ChatReport.Priority.NORMAL;
        });

        reportRepo.save(report);
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
