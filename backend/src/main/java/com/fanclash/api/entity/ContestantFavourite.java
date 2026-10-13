package com.fanclash.api.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "contestant_favourites")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ContestantFavourite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contestant_id", nullable = false)
    private Contestant contestant;

    @Column(name = "voter_key", nullable = false, length = 128)
    private String voterKey;

    /**
     * Client-generated UUID per logical click. UNIQUE in DB.
     * Retrying the same click reuses the same key → safe retry without double-counting.
     * A new intentional click uses a new key → always accepted.
     */
    @Column(name = "idempotency_key", nullable = false, length = 128, unique = true)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
