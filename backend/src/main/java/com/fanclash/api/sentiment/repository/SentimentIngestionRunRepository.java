package com.fanclash.api.sentiment.repository;

import com.fanclash.api.sentiment.entity.SentimentIngestionRun;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SentimentIngestionRunRepository extends JpaRepository<SentimentIngestionRun, Long> {
    List<SentimentIngestionRun> findTop20ByOrderByStartedAtDesc();
    List<SentimentIngestionRun> findByShowSlugOrderByStartedAtDesc(String showSlug);
}
