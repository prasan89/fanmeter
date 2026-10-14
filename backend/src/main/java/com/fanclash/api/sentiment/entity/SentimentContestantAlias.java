package com.fanclash.api.sentiment.entity;

import com.fanclash.api.entity.Contestant;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "sentiment_contestant_aliases",
    uniqueConstraints = @UniqueConstraint(columnNames = {"source_id", "alias_slug"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SentimentContestantAlias {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contestant_id", nullable = false)
    private Contestant contestant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_id", nullable = false)
    private SentimentSource source;

    @Column(name = "alias_name", nullable = false, length = 200)
    private String aliasName;

    @Column(name = "alias_slug", length = 200)
    private String aliasSlug;

    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal confidence = BigDecimal.ONE;

    @Column(name = "added_by", nullable = false, length = 32)
    private String addedBy = "auto";

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
