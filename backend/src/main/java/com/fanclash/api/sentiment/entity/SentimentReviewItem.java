package com.fanclash.api.sentiment.entity;

import com.fanclash.api.entity.Contestant;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "sentiment_review_queue")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SentimentReviewItem {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_id", nullable = false)
    private SentimentSource source;

    @Column(name = "show_slug", nullable = false, length = 64)
    private String showSlug;

    @Column(name = "source_name", nullable = false, length = 200)
    private String sourceName;

    @Column(name = "source_slug", length = 200)
    private String sourceSlug;

    @Column(name = "period_label", length = 64)
    private String periodLabel;

    @Column(nullable = false, length = 32)
    private String status = "pending";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_contestant_id")
    private Contestant resolvedContestant;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
