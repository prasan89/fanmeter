package com.fanclash.api.sentiment.repository;

import com.fanclash.api.sentiment.entity.SentimentSource;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SentimentSourceRepository extends JpaRepository<SentimentSource, Long> {
    Optional<SentimentSource> findBySourceKey(String sourceKey);
    List<SentimentSource> findByEnabledTrue();
}
