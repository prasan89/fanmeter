package com.fanclash.api.repository;

import com.fanclash.api.entity.VotingRound;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VotingRoundRepository extends JpaRepository<VotingRound, Long> {

    @EntityGraph(attributePaths = {"season", "season.show"})
    @Query("SELECT r FROM VotingRound r WHERE r.season.id = :seasonId AND r.status = 'open' ORDER BY r.createdAt DESC")
    Optional<VotingRound> findActiveRoundBySeasonId(@Param("seasonId") Long seasonId);

    @EntityGraph(attributePaths = {"season", "season.show"})
    Optional<VotingRound> findById(Long id);

    List<VotingRound> findBySeasonIdOrderByCreatedAtDesc(Long seasonId);
}
