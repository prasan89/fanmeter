package com.fanclash.api.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "voting_rounds")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class VotingRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false)
    private String status; // draft | open | closed

    @Column(name = "opens_at")
    private LocalDateTime opensAt;

    @Column(name = "closes_at")
    private LocalDateTime closesAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
