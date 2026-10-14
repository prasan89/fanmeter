package com.fanclash.api.sentiment.repository;

import com.fanclash.api.sentiment.entity.SentimentPoll;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SentimentPollRepository extends JpaRepository<SentimentPoll, Long> {
    Optional<SentimentPoll> findBySourceIdAndShowSlugAndPeriodLabel(Long sourceId, String showSlug, String periodLabel);
    List<SentimentPoll> findByShowSlugOrderByFetchedAtDesc(String showSlug);
    List<SentimentPoll> findByShowSlugAndPeriodLabelOrderByFetchedAtDesc(String showSlug, String periodLabel);
}
