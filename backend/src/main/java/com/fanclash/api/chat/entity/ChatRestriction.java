package com.fanclash.api.chat.entity;

import com.fanclash.api.chat.moderation.ViolationCategory;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "chat_restrictions")
@Getter @Setter @NoArgsConstructor
public class ChatRestriction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "guest_token", nullable = false, length = 64)
    private String guestToken;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false, length = 20)
    private Scope scope;

    @Column(name = "scope_ref", length = 200)
    private String scopeRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "restriction_type", nullable = false, length = 20)
    private RestrictionType restrictionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_category", nullable = false, length = 50)
    private ViolationCategory reasonCategory;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt = Instant.now();

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "issuer", nullable = false, length = 64)
    private String issuer;

    @Enumerated(EnumType.STRING)
    @Column(name = "appeal_status", nullable = false, length = 20)
    private AppealStatus appealStatus = AppealStatus.NONE;

    @Column(name = "appeal_note")
    private String appealNote;

    @Column(name = "audit_metadata", columnDefinition = "jsonb")
    private String auditMetadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoked_by", length = 64)
    private String revokedBy;

    public boolean isActive() {
        return revokedAt == null
                && (expiresAt == null || expiresAt.isAfter(Instant.now()));
    }

    public enum Scope { ROOM, EVENT, GLOBAL }
    public enum RestrictionType { WARNING, TIMEOUT, PERMANENT_BAN }
    public enum AppealStatus { NONE, PENDING, APPROVED, REJECTED }
}
