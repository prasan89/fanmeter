package com.fanclash.api.chat;

import com.fanclash.api.chat.service.ChatRateLimiter;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ChatRateLimiter — no Spring context, no DB.
 * Tests rate-limiting logic in isolation.
 */
class ChatRateLimiterTest {

    @Test
    void allowsUpToWindowLimit() {
        ChatRateLimiter limiter = new ChatRateLimiter();
        String token = "chat_guest_testtoken";
        String room  = "event:bigg-boss-tamil-10:season:6";

        // First 5 messages in the same window should all be allowed
        for (int i = 0; i < 5; i++) {
            assertTrue(limiter.allow(token, room), "Message " + (i + 1) + " should be allowed");
        }
    }

    @Test
    void blocksAfterWindowLimit() {
        ChatRateLimiter limiter = new ChatRateLimiter();
        String token = "chat_guest_blockedtoken";
        String room  = "event:bigg-boss-tamil-10:season:6";

        for (int i = 0; i < 5; i++) limiter.allow(token, room);

        // 6th message in the same window should be blocked
        assertFalse(limiter.allow(token, room), "6th message should be rate-limited");
    }

    @Test
    void differentTokensAreIndependent() {
        ChatRateLimiter limiter = new ChatRateLimiter();
        String tokenA = "chat_guest_aaaa";
        String tokenB = "chat_guest_bbbb";
        String room   = "event:bigg-boss-tamil-10:season:6";

        for (int i = 0; i < 5; i++) limiter.allow(tokenA, room);
        assertFalse(limiter.allow(tokenA, room), "tokenA should be rate-limited");

        // tokenB is a separate bucket — should still be allowed
        assertTrue(limiter.allow(tokenB, room), "tokenB should not be affected by tokenA's limit");
    }

    @Test
    void differentRoomsAreIndependent() {
        ChatRateLimiter limiter = new ChatRateLimiter();
        String token = "chat_guest_sametoken";
        String roomA = "event:bigg-boss-tamil-10:season:6";
        String roomB = "event:bigg-boss-telugu-10:season:7";

        for (int i = 0; i < 5; i++) limiter.allow(token, roomA);
        assertFalse(limiter.allow(token, roomA), "roomA should be rate-limited");

        // roomB has its own bucket
        assertTrue(limiter.allow(token, roomB), "roomB should not be affected by roomA's limit");
    }
}
