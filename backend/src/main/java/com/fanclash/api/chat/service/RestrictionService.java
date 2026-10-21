package com.fanclash.api.chat.service;

import com.fanclash.api.chat.entity.ChatModQueueItem;
import com.fanclash.api.chat.entity.ChatRestriction;
import com.fanclash.api.chat.entity.ChatViolationCount;
import com.fanclash.api.chat.moderation.ModerationResult;
import com.fanclash.api.chat.moderation.ViolationCategory;
import com.fanclash.api.chat.repository.ChatModQueueRepository;
import com.fanclash.api.chat.repository.ChatRestrictionRepository;
import com.fanclash.api.chat.repository.ChatViolationCountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

/**
 * Manages chat restrictions (warnings, timeouts, bans) with escalation.
 *
 * Escalation policy for minor violations:
 *   0 prior → ALLOW_WITH_WARNING (no restriction stored)
 *   1 prior → 5-minute timeout
 *   2 prior → 1-hour timeout
 *   3+ prior → permanent ban (requires moderator review to lift)
 *
 * High-severity / serious violations skip escalation and apply immediately:
 *   → Immediate 24-hour timeout + REVIEW queue
 *   → High-severity CSAM/imminent threat → immediate permanent restriction + CRITICAL queue
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RestrictionService {

    private final ChatRestrictionRepository  restrictionRepo;
    private final ChatViolationCountRepository violationCountRepo;
    private final ChatModQueueRepository     modQueueRepo;

    // ── Active restriction check ──────────────────────────────────────────────

    /**
     * Returns the most severe active restriction for this token in the given room, if any.
     */
    public Optional<ChatRestriction> findActiveRestriction(String guestToken, String roomId) {
        List<ChatRestriction> active = restrictionRepo.findActiveForTokenInRoom(
                guestToken, roomId, Instant.now());
        if (active.isEmpty()) return Optional.empty();
        // Return most severe
        return active.stream()
                .max((a, b) -> severityOrdinal(a.getRestrictionType()) - severityOrdinal(b.getRestrictionType()));
    }

    // ── Enforcement after moderation decision ────────────────────────────────

    @Transactional
    public Optional<ChatRestriction> enforceAfterViolation(
            String guestToken, String roomId, ModerationResult result) {

        if (result.highSeverity()) {
            // CSAM / imminent threat — immediate permanent ban + CRITICAL queue
            return Optional.of(issuePermanentBan(guestToken, roomId, result, "system"));
        }

        boolean serious = switch (result.decision()) {
            case RESTRICT_USER -> true;
            default -> false;
        };

        violationCountRepo.incrementViolations(guestToken, serious ? 0 : 1, serious ? 1 : 0, Instant.now());

        ChatViolationCount counts = violationCountRepo.findById(guestToken).orElse(null);
        int total = counts == null ? 1 : counts.getMinorCount() + counts.getSeriousCount();

        if (serious) {
            // Immediate 24-hour timeout + HIGH queue
            ChatRestriction restriction = issueTimeout(guestToken, roomId, 24 * 60, result, "system");
            queueForReview(null, roomId, result, ChatModQueueItem.Severity.HIGH);
            return Optional.of(restriction);
        }

        // Minor escalation
        if (total <= 1) {
            // First offence — just warn, no restriction record
            return Optional.empty();
        } else if (total == 2) {
            return Optional.of(issueTimeout(guestToken, roomId, 5, result, "system"));
        } else if (total == 3) {
            return Optional.of(issueTimeout(guestToken, roomId, 60, result, "system"));
        } else {
            return Optional.of(issuePermanentBan(guestToken, roomId, result, "system"));
        }
    }

    // ── Issue / revoke ────────────────────────────────────────────────────────

    @Transactional
    public ChatRestriction issueTimeout(String guestToken, String roomId, int durationMinutes,
                                        ModerationResult result, String issuer) {
        ChatRestriction r = buildRestriction(guestToken, roomId, result, issuer);
        r.setRestrictionType(ChatRestriction.RestrictionType.TIMEOUT);
        r.setExpiresAt(Instant.now().plus(durationMinutes, ChronoUnit.MINUTES));
        log.info("TIMEOUT issued for {} in {} for {}m reason={}", guestToken, roomId, durationMinutes,
                result.category());
        return restrictionRepo.save(r);
    }

    @Transactional
    public ChatRestriction issuePermanentBan(String guestToken, String roomId,
                                              ModerationResult result, String issuer) {
        ChatRestriction r = buildRestriction(guestToken, roomId, result, issuer);
        r.setRestrictionType(ChatRestriction.RestrictionType.PERMANENT_BAN);
        r.setExpiresAt(null);

        if (result.highSeverity()) {
            queueForReview(null, roomId, result, ChatModQueueItem.Severity.CRITICAL);
        }

        log.warn("PERMANENT BAN issued for {} in {} reason={}", guestToken, roomId, result.category());
        return restrictionRepo.save(r);
    }

    @Transactional
    public ChatRestriction issueModeratorAction(String guestToken, String roomId,
                                                 ChatRestriction.RestrictionType type,
                                                 ViolationCategory category,
                                                 Integer durationMinutes,
                                                 String issuer) {
        ChatRestriction r = new ChatRestriction();
        r.setGuestToken(guestToken);
        r.setScope(roomId != null ? ChatRestriction.Scope.ROOM : ChatRestriction.Scope.GLOBAL);
        r.setScopeRef(roomId);
        r.setRestrictionType(type);
        r.setReasonCategory(category != null ? category : ViolationCategory.OTHER);
        r.setIssuer(issuer);
        if (type == ChatRestriction.RestrictionType.TIMEOUT && durationMinutes != null) {
            r.setExpiresAt(Instant.now().plus(durationMinutes, ChronoUnit.MINUTES));
        }
        return restrictionRepo.save(r);
    }

    @Transactional
    public void revokeRestriction(Long restrictionId, String revokedBy) {
        restrictionRepo.findById(restrictionId).ifPresent(r -> {
            r.setRevokedAt(Instant.now());
            r.setRevokedBy(revokedBy);
            restrictionRepo.save(r);
            log.info("Restriction {} revoked by {}", restrictionId, revokedBy);
        });
    }

    @Transactional
    public void resolveAppeal(Long restrictionId, boolean approved, String reviewer, String note) {
        restrictionRepo.findById(restrictionId).ifPresent(r -> {
            r.setAppealStatus(approved
                    ? ChatRestriction.AppealStatus.APPROVED
                    : ChatRestriction.AppealStatus.REJECTED);
            r.setAppealNote(note);
            if (approved) {
                r.setRevokedAt(Instant.now());
                r.setRevokedBy(reviewer);
            }
            restrictionRepo.save(r);
        });
    }

    @Transactional
    public void submitAppeal(Long restrictionId) {
        restrictionRepo.findById(restrictionId).ifPresent(r -> {
            if (r.getAppealStatus() == ChatRestriction.AppealStatus.NONE) {
                r.setAppealStatus(ChatRestriction.AppealStatus.PENDING);
                restrictionRepo.save(r);
            }
        });
    }

    // ── Moderation queue ─────────────────────────────────────────────────────

    @Transactional
    public void queueForReview(Long messageId, String roomId,
                                ModerationResult result, ChatModQueueItem.Severity severity) {
        ChatModQueueItem item = new ChatModQueueItem();
        item.setMessageId(messageId);
        item.setRoomId(roomId);
        item.setFlagReason(result.category() != null ? result.category().name() : "SYSTEM");
        item.setSeverity(severity);
        modQueueRepo.save(item);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ChatRestriction buildRestriction(String guestToken, String roomId,
                                              ModerationResult result, String issuer) {
        ChatRestriction r = new ChatRestriction();
        r.setGuestToken(guestToken);
        r.setScope(ChatRestriction.Scope.ROOM);
        r.setScopeRef(roomId);
        r.setReasonCategory(result.category() != null ? result.category() : ViolationCategory.OTHER);
        r.setIssuer(issuer);
        return r;
    }

    private int severityOrdinal(ChatRestriction.RestrictionType type) {
        return switch (type) {
            case WARNING       -> 0;
            case TIMEOUT       -> 1;
            case PERMANENT_BAN -> 2;
        };
    }
}
