package com.fanclash.api.sentiment.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "sentiment_sources")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SentimentSource {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_key", nullable = false, unique = true, length = 64)
    private String sourceKey;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(name = "base_url", nullable = false, columnDefinition = "TEXT")
    private String baseUrl;

    @Column(name = "adapter_class", nullable = false, length = 200)
    private String adapterClass;

    @Column(nullable = false, precision = 4, scale = 2)
    private BigDecimal weight = BigDecimal.ONE;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(name = "robots_compliant", nullable = false)
    private Boolean robotsCompliant = true;

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
