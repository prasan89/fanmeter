package com.fanclash.api.sentiment.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "sentiment_ingestion_runs")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SentimentIngestionRun {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_id", nullable = false)
    private SentimentSource source;

    @Column(name = "show_slug", nullable = false, length = 64)
    private String showSlug;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "finished_at")
    private OffsetDateTime finishedAt;

    @Column(nullable = false, length = 32)
    private String status = "running";

    @Column(name = "observations_written", nullable = false)
    private Integer observationsWritten = 0;

    @Column(name = "error_detail", columnDefinition = "TEXT")
    private String errorDetail;

    @Column(name = "http_status")
    private Integer httpStatus;

    @Column(name = "raw_url", columnDefinition = "TEXT")
    private String rawUrl;

    @PrePersist
    protected void onCreate() {
        startedAt = OffsetDateTime.now();
    }
}
