package com.fanclash.api.sentiment.entity;

import com.fanclash.api.entity.Contestant;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Pre-computed Fan Sentiment Score snapshot.
 *
 * Formula: external_score = 100 * SUM(w_s * p_s_c) / SUM(w_s)
 *   where p_s_c = raw_count_for_contestant / sum(raw_counts_in_poll)
 *
 * combined_score blends external_score with fanmeter_share.
 */
@Entity
@Table(name = "sentiment_score_snapshots",
    uniqueConstraints = @UniqueConstraint(columnNames = {"show_slug", "contestant_id", "period_label"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SentimentScoreSnapshot {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "show_slug", nullable = false, length = 64)
    private String showSlug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contestant_id", nullable = false)
    private Contestant contestant;

    @Column(name = "period_label", nullable = false, length = 64)
    private String periodLabel;

    @Column(name = "fanmeter_votes", nullable = false)
    private Long fanmeterVotes = 0L;

    @Column(name = "fanmeter_share", precision = 8, scale = 4)
    private BigDecimal fanmeterShare;

    @Column(name = "external_score", precision = 8, scale = 4)
    private BigDecimal externalScore;

    @Column(name = "combined_score", precision = 8, scale = 4)
    private BigDecimal combinedScore;

    @Column(name = "sources_used", nullable = false)
    private Integer sourcesUsed = 0;

    @Column(name = "computed_at", nullable = false)
    private OffsetDateTime computedAt;

    @PrePersist @PreUpdate
    protected void onTouch() {
        computedAt = OffsetDateTime.now();
    }
}
