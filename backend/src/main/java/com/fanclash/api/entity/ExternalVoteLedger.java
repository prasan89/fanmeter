package com.fanclash.api.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "external_vote_ledger")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExternalVoteLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_key", nullable = false)
    private String sourceKey;

    @Column(name = "show_slug", nullable = false)
    private String showSlug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contestant_id", nullable = false)
    private Contestant contestant;

    @Column(name = "last_raw_count", nullable = false)
    private long lastRawCount;

    @Column(name = "last_applied_at", nullable = false)
    private OffsetDateTime lastAppliedAt;

    @PrePersist
    protected void onCreate() {
        if (lastAppliedAt == null) lastAppliedAt = OffsetDateTime.now();
    }
}
