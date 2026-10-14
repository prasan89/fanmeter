package com.fanclash.api.sentiment.repository;

import com.fanclash.api.sentiment.entity.SentimentObservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SentimentObservationRepository extends JpaRepository<SentimentObservation, Long> {
    List<SentimentObservation> findByPollId(Long pollId);

    @Query("SELECT o FROM SentimentObservation o WHERE o.poll.showSlug = :showSlug AND o.poll.periodLabel = :periodLabel ORDER BY o.rawCount DESC")
    List<SentimentObservation> findByShowSlugAndPeriodLabel(String showSlug, String periodLabel);
}
