package com.fanclash.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "contestant_favourite_counts")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@IdClass(ContestantFavouriteCountId.class)
public class ContestantFavouriteCount {

    @Id
    @Column(name = "season_id")
    private Long seasonId;

    @Id
    @Column(name = "contestant_id")
    private Long contestantId;

    @Column(name = "total", nullable = false)
    private long total;

    @Column(name = "baseline_count", nullable = false)
    private long baselineCount;

    @Column(name = "updated_at", nullable = false)
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
