package com.fanclash.api.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "fan_votes",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_fan_votes_round_contestant_voter",
           columnNames = {"voting_round_id", "contestant_id", "voter_key"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class FanVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voting_round_id", nullable = false)
    private VotingRound votingRound;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contestant_id", nullable = false)
    private Contestant contestant;

    @Column(name = "voter_key", nullable = false, length = 128)
    private String voterKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
