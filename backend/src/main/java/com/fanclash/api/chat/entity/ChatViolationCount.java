package com.fanclash.api.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "chat_violation_counts")
@Getter @Setter @NoArgsConstructor
public class ChatViolationCount {

    @Id
    @Column(name = "guest_token", length = 64)
    private String guestToken;

    @Column(name = "minor_count", nullable = false)
    private int minorCount = 0;

    @Column(name = "serious_count", nullable = false)
    private int seriousCount = 0;

    @Column(name = "last_violation")
    private Instant lastViolation;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
