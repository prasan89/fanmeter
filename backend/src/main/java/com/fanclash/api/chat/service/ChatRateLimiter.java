package com.fanclash.api.chat.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory token-bucket rate limiter per (guest token + room).
 * 5 messages / 10 s for any user. Configurable via constructor if needed.
 * Runs in the backend process — not shared across instances. For multi-instance
 * deployments, promote to Redis or move behind an API gateway rate limit.
 */
@Slf4j
@Component
public class ChatRateLimiter {

    private final int  windowMessages;
    private final long windowSeconds;

    private record Bucket(long windowStart, int count) {}

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public ChatRateLimiter() {
        this.windowMessages = 5;
        this.windowSeconds  = 10;
    }

    /** Returns true if the request is allowed, false if rate-limited. */
    public boolean allow(String guestToken, String roomId) {
        String key  = guestToken + "|" + roomId;
        long   now  = Instant.now().getEpochSecond();

        Bucket existing = buckets.get(key);
        if (existing == null || now - existing.windowStart() >= windowSeconds) {
            buckets.put(key, new Bucket(now, 1));
            return true;
        }
        if (existing.count() < windowMessages) {
            buckets.put(key, new Bucket(existing.windowStart(), existing.count() + 1));
            return true;
        }
        return false;
    }
}
