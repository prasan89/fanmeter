package com.fanclash.api.sentiment.repository;

import com.fanclash.api.sentiment.entity.SentimentScoreSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface SentimentScoreSnapshotRepository extends JpaRepository<SentimentScoreSnapshot, Long> {
    List<SentimentScoreSnapshot> findByShowSlugAndPeriodLabelOrderByCombinedScoreDesc(String showSlug, String periodLabel);
    Optional<SentimentScoreSnapshot> findByShowSlugAndContestantIdAndPeriodLabel(String showSlug, Long contestantId, String periodLabel);

    @Query("SELECT s FROM SentimentScoreSnapshot s WHERE s.showSlug = :showSlug ORDER BY s.computedAt DESC")
    List<SentimentScoreSnapshot> findLatestByShowSlug(String showSlug);

    @Query(value = """
        SELECT DISTINCT ON (contestant_id) *
        FROM sentiment_score_snapshots
        WHERE show_slug = :showSlug
        ORDER BY contestant_id, computed_at DESC
        """, nativeQuery = true)
    List<SentimentScoreSnapshot> findMostRecentPerContestant(String showSlug);
}
