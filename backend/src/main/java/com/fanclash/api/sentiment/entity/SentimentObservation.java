package com.fanclash.api.sentiment.entity;

import com.fanclash.api.entity.Contestant;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * One row = "source reported this many votes for this contestant in this period".
 *
 * INTEGRITY CONSTRAINT: raw_count MUST NEVER be added to fan_votes or
 * contestant_favourite_counts. This data is third-party poll data, not FanMeter votes.
 */
@Entity
@Table(name = "sentiment_observations")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SentimentObservation {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "poll_id", nullable = false)
    private SentimentPoll poll;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contestant_id")
    private Contestant contestant;

    @Column(name = "source_name", nullable = false, length = 200)
    private String sourceName;

    @Column(name = "source_slug", length = 200)
    private String sourceSlug;

    /** Raw vote count from external source. NEVER add to FanMeter totals. */
    @Column(name = "raw_count", nullable = false)
    private Long rawCount;

    @Column(name = "share_pct", precision = 6, scale = 3)
    private BigDecimal sharePct;

    @Column(name = "rank_position")
    private Integer rankPosition;

    @Column(nullable = false)
    private Boolean resolved = false;

    @Column(name = "needs_review", nullable = false)
    private Boolean needsReview = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
