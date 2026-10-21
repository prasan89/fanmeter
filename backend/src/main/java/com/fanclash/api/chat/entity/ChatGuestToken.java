package com.fanclash.api.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "chat_guest_tokens")
@Getter @Setter @NoArgsConstructor
public class ChatGuestToken {

    @Id
    @Column(length = 64)
    private String token;

    @Column(name = "display_name", nullable = false, length = 50)
    private String displayName;

    @Column(name = "ip_fingerprint", length = 64)
    private String ipFingerprint;

    @Column(name = "banned_until")
    private Instant bannedUntil;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt = Instant.now();

    public boolean isBanned() {
        return bannedUntil != null && bannedUntil.isAfter(Instant.now());
    }
}
