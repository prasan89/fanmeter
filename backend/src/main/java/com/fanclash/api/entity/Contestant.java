package com.fanclash.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "contestants")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Contestant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String slug;

    @Column(name = "profile_image")
    private String profileImage;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "cover_image")
    private String coverImage;

    @Column(nullable = false)
    private String status;

    /** Wikipedia source URL for contestant data */
    @Column(name = "source_url")
    private String sourceUrl;

    /** Timestamp of last successful Wikipedia verification */
    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    /** Notes from sync — e.g. "Status updated from Wikipedia" */
    @Column(name = "sync_notes")
    private String syncNotes;

    /** ok | needs_review | unverified */
    @Column(name = "sync_flag")
    @Builder.Default
    private String syncFlag = "ok";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (syncFlag == null) syncFlag = "ok";
    }
}
