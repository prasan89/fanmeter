package com.fanclash.api.chat;

import com.fanclash.api.chat.entity.ChatModQueueItem;
import com.fanclash.api.chat.entity.ChatRestriction;
import com.fanclash.api.chat.entity.ChatViolationCount;
import com.fanclash.api.chat.moderation.ModerationDecision;
import com.fanclash.api.chat.moderation.ModerationResult;
import com.fanclash.api.chat.moderation.ViolationCategory;
import com.fanclash.api.chat.repository.ChatModQueueRepository;
import com.fanclash.api.chat.repository.ChatRestrictionRepository;
import com.fanclash.api.chat.repository.ChatViolationCountRepository;
import com.fanclash.api.chat.service.RestrictionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RestrictionServiceTest {

    @Mock ChatRestrictionRepository  restrictionRepo;
    @Mock ChatViolationCountRepository violationCountRepo;
    @Mock ChatModQueueRepository     modQueueRepo;

    @InjectMocks
    RestrictionService service;

    private static final String TOKEN  = "chat_guest_test";
    private static final String ROOM   = "event:bigg-boss-tamil-10:season:6";

    private ChatRestriction activeTimeout(int remainingMinutes) {
        ChatRestriction r = new ChatRestriction();
        r.setGuestToken(TOKEN);
        r.setScope(ChatRestriction.Scope.ROOM);
        r.setScopeRef(ROOM);
        r.setRestrictionType(ChatRestriction.RestrictionType.TIMEOUT);
        r.setReasonCategory(ViolationCategory.SPAM);
        r.setExpiresAt(Instant.now().plus(remainingMinutes, ChronoUnit.MINUTES));
        r.setIssuer("system");
        return r;
    }

    // ── findActiveRestriction ─────────────────────────────────────────────────

    @Test
    void noActiveRestrictionWhenListEmpty() {
        when(restrictionRepo.findActiveForTokenInRoom(eq(TOKEN), eq(ROOM), any()))
                .thenReturn(List.of());
        assertTrue(service.findActiveRestriction(TOKEN, ROOM).isEmpty());
    }

    @Test
    void findsActiveTimeoutRestriction() {
        ChatRestriction timeout = activeTimeout(5);
        when(restrictionRepo.findActiveForTokenInRoom(eq(TOKEN), eq(ROOM), any()))
                .thenReturn(List.of(timeout));
        Optional<ChatRestriction> result = service.findActiveRestriction(TOKEN, ROOM);
        assertTrue(result.isPresent());
        assertEquals(ChatRestriction.RestrictionType.TIMEOUT, result.get().getRestrictionType());
    }

    @Test
    void returnsMostSevereRestrictionWhenMultiple() {
        ChatRestriction timeout = activeTimeout(5);
        ChatRestriction ban = new ChatRestriction();
        ban.setRestrictionType(ChatRestriction.RestrictionType.PERMANENT_BAN);
        ban.setReasonCategory(ViolationCategory.THREAT);
        ban.setIssuer("system");
        ban.setScope(ChatRestriction.Scope.GLOBAL);
        when(restrictionRepo.findActiveForTokenInRoom(any(), any(), any()))
                .thenReturn(List.of(timeout, ban));
        Optional<ChatRestriction> result = service.findActiveRestriction(TOKEN, ROOM);
        assertTrue(result.isPresent());
        assertEquals(ChatRestriction.RestrictionType.PERMANENT_BAN, result.get().getRestrictionType());
    }

    // ── Escalation logic ──────────────────────────────────────────────────────

    @Test
    void firstMinorViolationReturnsNoRestriction() {
        // First minor offence — no restriction created
        when(violationCountRepo.findById(TOKEN)).thenReturn(Optional.empty());
        ModerationResult warn = ModerationResult.allowWithWarning(ViolationCategory.SPAM, "word_flood");
        Optional<ChatRestriction> result = service.enforceAfterViolation(TOKEN, ROOM, warn);
        assertTrue(result.isEmpty());
        verify(restrictionRepo, never()).save(any());
    }

    @Test
    void secondMinorViolationIssues5MinTimeout() {
        // 2 total violations → 5-min timeout
        ChatViolationCount counts = new ChatViolationCount();
        counts.setGuestToken(TOKEN);
        counts.setMinorCount(2);
        counts.setSeriousCount(0);
        when(violationCountRepo.findById(TOKEN)).thenReturn(Optional.of(counts));
        when(restrictionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ModerationResult warn = ModerationResult.allowWithWarning(ViolationCategory.SPAM, "word_flood");
        Optional<ChatRestriction> result = service.enforceAfterViolation(TOKEN, ROOM, warn);
        assertTrue(result.isPresent());
        assertEquals(ChatRestriction.RestrictionType.TIMEOUT, result.get().getRestrictionType());
        // Expires ~5 minutes from now (allow 1 second tolerance)
        assertTrue(result.get().getExpiresAt().isAfter(Instant.now().plus(4, ChronoUnit.MINUTES)));
        assertTrue(result.get().getExpiresAt().isBefore(Instant.now().plus(6, ChronoUnit.MINUTES)));
    }

    @Test
    void seriousViolationIssues24HourTimeoutAndQueues() {
        when(violationCountRepo.findById(TOKEN)).thenReturn(Optional.empty());
        when(restrictionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(modQueueRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ModerationResult serious = ModerationResult.restrictUser(ViolationCategory.THREAT, "hurt_you", false);
        Optional<ChatRestriction> result = service.enforceAfterViolation(TOKEN, ROOM, serious);
        assertTrue(result.isPresent());
        assertEquals(ChatRestriction.RestrictionType.TIMEOUT, result.get().getRestrictionType());
        assertTrue(result.get().getExpiresAt().isAfter(Instant.now().plus(23, ChronoUnit.HOURS)));
        verify(modQueueRepo).save(argThat(q ->
                ((ChatModQueueItem) q).getSeverity() == ChatModQueueItem.Severity.HIGH));
    }

    @Test
    void highSeverityViolationIssuesPermanentBanAndCriticalQueue() {
        when(restrictionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(modQueueRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ModerationResult csam = ModerationResult.restrictUser(ViolationCategory.SEXUAL_MINOR, "child_sex_link", true);
        Optional<ChatRestriction> result = service.enforceAfterViolation(TOKEN, ROOM, csam);
        assertTrue(result.isPresent());
        assertEquals(ChatRestriction.RestrictionType.PERMANENT_BAN, result.get().getRestrictionType());
        assertNull(result.get().getExpiresAt());
        verify(modQueueRepo).save(argThat(q ->
                ((ChatModQueueItem) q).getSeverity() == ChatModQueueItem.Severity.CRITICAL));
    }

    // ── Revoke and appeal ─────────────────────────────────────────────────────

    @Test
    void revokeSetRevokedFields() {
        ChatRestriction r = activeTimeout(60);
        when(restrictionRepo.findById(1L)).thenReturn(Optional.of(r));
        when(restrictionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        service.revokeRestriction(1L, "admin");
        assertNotNull(r.getRevokedAt());
        assertEquals("admin", r.getRevokedBy());
    }

    @Test
    void resolveAppealApproved() {
        ChatRestriction r = activeTimeout(1440);
        when(restrictionRepo.findById(2L)).thenReturn(Optional.of(r));
        when(restrictionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        service.resolveAppeal(2L, true, "mod1", "Appeal granted — first offense");
        assertEquals(ChatRestriction.AppealStatus.APPROVED, r.getAppealStatus());
        assertNotNull(r.getRevokedAt());
    }

    @Test
    void resolveAppealRejected() {
        ChatRestriction r = activeTimeout(1440);
        when(restrictionRepo.findById(3L)).thenReturn(Optional.of(r));
        when(restrictionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        service.resolveAppeal(3L, false, "mod1", "Pattern of behavior");
        assertEquals(ChatRestriction.AppealStatus.REJECTED, r.getAppealStatus());
        assertNull(r.getRevokedAt());
    }
}
