package com.fanclash.api.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "nomination_sync_logs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NominationSyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "show_slug")
    private String showSlug;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @Column(nullable = false)
    private String status = "running";

    @Column(name = "sources_checked")
    private Integer sourcesChecked = 0;

    @Column(name = "nominees_found")
    private Integer nomineesFound = 0;

    @Column(name = "conflicts_found")
    private Integer conflictsFound = 0;

    @Column(name = "error_detail", columnDefinition = "TEXT")
    private String errorDetail;

    @PrePersist
    protected void onCreate() {
        if (startedAt == null) startedAt = LocalDateTime.now();
    }
}
