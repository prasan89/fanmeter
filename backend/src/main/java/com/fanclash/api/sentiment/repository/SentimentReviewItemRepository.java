package com.fanclash.api.sentiment.repository;

import com.fanclash.api.sentiment.entity.SentimentReviewItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SentimentReviewItemRepository extends JpaRepository<SentimentReviewItem, Long> {
    List<SentimentReviewItem> findByStatusOrderByCreatedAtDesc(String status);
    Optional<SentimentReviewItem> findBySourceIdAndShowSlugAndSourceSlug(Long sourceId, String showSlug, String sourceSlug);
    List<SentimentReviewItem> findByShowSlugAndStatus(String showSlug, String status);
}
