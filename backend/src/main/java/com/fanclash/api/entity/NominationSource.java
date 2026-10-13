package com.fanclash.api.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "nomination_sources")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NominationSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "poll_id", nullable = false)
    private EvictionPoll poll;

    @Column(nullable = false)
    private String publication;

    @Column(nullable = false)
    private String url;

    @Column(name = "retrieved_at", nullable = false)
    private LocalDateTime retrievedAt;

    @Column(nullable = false)
    private String status = "unverified";

    @Column(name = "raw_names", columnDefinition = "TEXT")
    private String rawNames;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @PrePersist
    protected void onCreate() {
        if (retrievedAt == null) retrievedAt = LocalDateTime.now();
    }
}
