package com.fanclash.api.chat;

import com.fanclash.api.chat.moderation.ContentModerationService;
import com.fanclash.api.chat.moderation.ModerationDecision;
import com.fanclash.api.chat.moderation.ModerationResult;
import com.fanclash.api.chat.moderation.ViolationCategory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ContentModerationService rule engine.
 * Tests cover English, Tamil/Tanglish, obfuscations, false positives, and spam.
 */
class ContentModerationServiceTest {

    private ContentModerationService service;

    @BeforeEach
    void setUp() {
        service = new ContentModerationService();
    }

    // ── Normal conversation (must ALLOW) ─────────────────────────────────────

    @Test
    void allowsNormalEnglishMessage() {
        ModerationResult r = service.evaluate("Bigg Boss is so entertaining this week!");
        assertEquals(ModerationDecision.ALLOW, r.decision());
    }

    @Test
    void allowsNormalTamilMessage() {
        ModerationResult r = service.evaluate("Bigg Boss Tamil romba nalla irukku!");
        assertEquals(ModerationDecision.ALLOW, r.decision());
    }

    @Test
    void allowsTanglishMessage() {
        ModerationResult r = service.evaluate("Enna aachu? Eviction pochu nu nenaikiren!");
        assertEquals(ModerationDecision.ALLOW, r.decision());
    }

    @Test
    void allowsEmoji() {
        ModerationResult r = service.evaluate("Vote pannunga 🙏❤️🔥");
        assertEquals(ModerationDecision.ALLOW, r.decision());
    }

    @Test
    void allowsContestantSupport() {
        ModerationResult r = service.evaluate("Archana is the best contestant! She deserves to win.");
        assertEquals(ModerationDecision.ALLOW, r.decision());
    }

    @Test
    void allowsQuestionMessage() {
        ModerationResult r = service.evaluate("Who do you think will be evicted this week?");
        assertEquals(ModerationDecision.ALLOW, r.decision());
    }

    // ── CSAM signals (must RESTRICT_USER + highSeverity) ─────────────────────

    @Test
    void detectsCSAMSignal() {
        ModerationResult r = service.evaluate("child sex link");
        assertEquals(ModerationDecision.RESTRICT_USER, r.decision());
        assertEquals(ViolationCategory.SEXUAL_MINOR, r.category());
        assertTrue(r.highSeverity());
    }

    @Test
    void detectsObfuscatedCSAM() {
        ModerationResult r = service.evaluate("ch1ld nuDE");
        assertEquals(ModerationDecision.RESTRICT_USER, r.decision());
        assertTrue(r.highSeverity());
    }

    // ── Imminent threats (must RESTRICT_USER + highSeverity) ─────────────────

    @Test
    void detectsImminentThreat() {
        ModerationResult r = service.evaluate("I will kill you");
        assertEquals(ModerationDecision.RESTRICT_USER, r.decision());
        assertEquals(ViolationCategory.THREAT, r.category());
        assertTrue(r.highSeverity());
    }

    @Test
    void detectsTamilThreat() {
        ModerationResult r = service.evaluate("unna kill panniduven");
        assertEquals(ModerationDecision.RESTRICT_USER, r.decision());
    }

    // ── Serious threats (RESTRICT_USER, not necessarily highSeverity) ─────────

    @Test
    void detectsSeriousThreatHurt() {
        ModerationResult r = service.evaluate("I will hurt you");
        assertEquals(ModerationDecision.RESTRICT_USER, r.decision());
        assertEquals(ViolationCategory.THREAT, r.category());
    }

    @Test
    void detectsLocationStalking() {
        ModerationResult r = service.evaluate("send your location now");
        assertEquals(ModerationDecision.RESTRICT_USER, r.decision());
    }

    // ── Hate speech (must BLOCK) ──────────────────────────────────────────────

    @Test
    void detectsHateSpeechSlur() {
        // Using normalized spelling — leet reversed to base form
        ModerationResult r = service.evaluate("you are such a n1gger");
        assertEquals(ModerationDecision.BLOCK, r.decision());
        assertEquals(ViolationCategory.HATE_SPEECH, r.category());
    }

    @Test
    void detectsHateSpeechHomophobicSlur() {
        ModerationResult r = service.evaluate("stop being a faggot");
        assertEquals(ModerationDecision.BLOCK, r.decision());
    }

    // ── Doxxing (BLOCK or REVIEW) ─────────────────────────────────────────────

    @Test
    void detectsPhoneNumber() {
        ModerationResult r = service.evaluate("Call me at +91 98765 43210");
        assertEquals(ModerationDecision.BLOCK, r.decision());
        assertEquals(ViolationCategory.DOXXING, r.category());
    }

    @Test
    void detectsPasswordShare() {
        ModerationResult r = service.evaluate("password: hunter2");
        assertEquals(ModerationDecision.BLOCK, r.decision());
        assertEquals(ViolationCategory.DOXXING, r.category());
    }

    @Test
    void reviewsEmailAddress() {
        ModerationResult r = service.evaluate("email me at user@example.com");
        assertEquals(ModerationDecision.REVIEW, r.decision());
    }

    @Test
    void reviewsURL() {
        ModerationResult r = service.evaluate("check out www.example.com/vote");
        assertEquals(ModerationDecision.REVIEW, r.decision());
        assertEquals(ViolationCategory.PHISHING, r.category());
    }

    // ── Spam (ALLOW_WITH_WARNING) ─────────────────────────────────────────────

    @Test
    void detectsWordFlood() {
        ModerationResult r = service.evaluate("vote vote vote vote vote vote");
        assertEquals(ModerationDecision.ALLOW_WITH_WARNING, r.decision());
        assertEquals(ViolationCategory.SPAM, r.category());
    }

    @Test
    void detectsCharFlood() {
        ModerationResult r = service.evaluate("aaaaaaaaaaaaaaaaaaaaaaaaaa");
        assertEquals(ModerationDecision.ALLOW_WITH_WARNING, r.decision());
    }

    @Test
    void detectsCapsFlood() {
        ModerationResult r = service.evaluate("THIS IS NOT SPAM VOTE VOTE VOTE VOTE VOTE");
        assertEquals(ModerationDecision.ALLOW_WITH_WARNING, r.decision());
        assertEquals(ViolationCategory.SPAM, r.category());
    }

    // ── Mild profanity (ALLOW_WITH_WARNING) ──────────────────────────────────

    @Test
    void warnsMildProfanity() {
        ModerationResult r = service.evaluate("what the shit is this eviction");
        assertEquals(ModerationDecision.ALLOW_WITH_WARNING, r.decision());
    }

    // ── Common obfuscations ───────────────────────────────────────────────────

    @Test
    void normalizeTextBlock() {
        String normalized = service.normalize("n-i-g-g-e-r");
        // After dehyphen and leet reversal should contain base word
        assertFalse(normalized.contains("-"));
    }

    @Test
    void normalizeLeetSpeak() {
        String normalized = service.normalize("f4gg0t");
        // After leet reversal: 4→a, 0→o → "faggot"
        assertTrue(normalized.contains("faggot") || normalized.contains("fagg"));
    }

    // ── False positive protection ─────────────────────────────────────────────

    @Test
    void doesNotFlagWordContainingSlurFragment() {
        // "classic" contains "ass" but shouldn't trigger hate speech
        ModerationResult r = service.evaluate("That was a classic episode!");
        // Should not be BLOCK for hate speech
        assertNotEquals(ViolationCategory.HATE_SPEECH, r.category());
    }

    @Test
    void doesNotFlagNormalSentenceWithNumbers() {
        // Phone-like number string in a normal sentence shouldn't always block
        ModerationResult r = service.evaluate("The show started at 9:30 on channel 5");
        // 9:30 and 5 don't form a phone number pattern
        assertNotEquals(ViolationCategory.DOXXING, r.category());
    }
}
