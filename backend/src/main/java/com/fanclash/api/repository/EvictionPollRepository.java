package com.fanclash.api.repository;

import com.fanclash.api.entity.EvictionPoll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EvictionPollRepository extends JpaRepository<EvictionPoll, Long> {

    List<EvictionPoll> findBySeasonIdOrderByWeekNumberDesc(Long seasonId);

    Optional<EvictionPoll> findTopBySeasonIdAndStatusOrderByWeekNumberDesc(Long seasonId, String status);

    /** Returns the most recent poll regardless of status — used to show pending/unavailable state */
    @Query("SELECT p FROM EvictionPoll p WHERE p.season.id = :seasonId ORDER BY p.weekNumber DESC LIMIT 1")
    Optional<EvictionPoll> findMostRecentBySeasonId(@Param("seasonId") Long seasonId);

    @Query("SELECT p FROM EvictionPoll p WHERE p.season.id = :seasonId AND p.status IN ('closed','archived') ORDER BY p.weekNumber DESC")
    List<EvictionPoll> findHistoryBySeasonId(@Param("seasonId") Long seasonId);

    boolean existsBySeasonIdAndWeekNumber(Long seasonId, Integer weekNumber);

    @Query("SELECT p FROM EvictionPoll p WHERE p.status = 'open' AND p.closesAt IS NOT NULL AND p.closesAt < :now")
    List<EvictionPoll> findExpiredOpenPolls(@Param("now") LocalDateTime now);
}
