package com.fanclash.api.sentiment.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Public API response for GET /api/events/{eventSlug}/sentiment
 */
public record SentimentSummaryDto(
    String showSlug,
    String periodLabel,
    int sourcesUsed,
    OffsetDateTime computedAt,
    List<ContestantSentimentDto> contestants
) {
    public record ContestantSentimentDto(
        Long contestantId,
        String contestantName,
        String contestantSlug,
        String profileImage,
        long fanmeterVotes,
        BigDecimal fanmeterSharePct,     // 0-100
        BigDecimal externalScore,        // 0-100 weighted external share
        BigDecimal combinedScore,        // 0-100 blended score
        int rank,
        List<SourceObservationDto> sourceData
    ) {}

    public record SourceObservationDto(
        String sourceKey,
        String sourceDisplayName,
        String pollUrl,
        long rawCount,
        BigDecimal sharePct,
        int rankPosition
    ) {}
}
