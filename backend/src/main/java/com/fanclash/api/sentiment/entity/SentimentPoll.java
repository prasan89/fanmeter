package com.fanclash.api.sentiment.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.List;

@Entity
@Table(name = "sentiment_polls",
    uniqueConstraints = @UniqueConstraint(columnNames = {"source_id", "show_slug", "period_label"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SentimentPoll {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_id", nullable = false)
    private SentimentSource source;

    @Column(name = "show_slug", nullable = false, length = 64)
    private String showSlug;

    @Column(name = "period_label", nullable = false, length = 64)
    private String periodLabel;

    @Column(name = "period_week")
    private Integer periodWeek;

    @Column(name = "poll_url", columnDefinition = "TEXT")
    private String pollUrl;

    @Column(name = "total_votes")
    private Long totalVotes;

    @Column(name = "source_updated_at")
    private OffsetDateTime sourceUpdatedAt;

    @Column(name = "fetched_at", nullable = false)
    private OffsetDateTime fetchedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id")
    private SentimentIngestionRun run;

    @OneToMany(mappedBy = "poll", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SentimentObservation> observations;

    @PrePersist
    protected void onCreate() {
        fetchedAt = OffsetDateTime.now();
    }
}
