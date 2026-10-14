package com.fanclash.api.sentiment.adapter;

import java.util.List;

/**
 * Pluggable adapter for an external fan-poll source.
 *
 * Implementations must:
 * - Only read data from pages they are authorised to scrape (robots.txt compliant)
 * - Return raw vote counts exactly as reported by the source — never modify them
 * - Never interact with FanMeter's vote ledger (fan_votes, contestant_favourite_counts)
 */
public interface SentimentSourceAdapter {

    /** Stable identifier matching sentiment_sources.source_key */
    String getSourceKey();

    /**
     * Fetch external poll data for one show.
     *
     * @param showSlug  e.g. "bigg-boss-tamil"
     * @param pollUrl   the URL to fetch (from show config or constructed by adapter)
     * @return FetchResult with observations and metadata
     */
    FetchResult fetchPoll(String showSlug, String pollUrl);

    /** Build the poll URL for the given show slug and season segment. */
    String buildPollUrl(String showSlug, String seasonSegment);

    // ── Result types ──────────────────────────────────────────────────────────

    record FetchResult(
        boolean success,
        String periodLabel,
        Integer periodWeek,
        Long totalVotes,
        String sourceUpdatedAt,
        List<CandidateObservation> observations,
        String errorMessage,
        int httpStatus
    ) {
        public static FetchResult failure(String error, int httpStatus) {
            return new FetchResult(false, null, null, null, null, List.of(), error, httpStatus);
        }
    }

    /**
     * One contestant's data as reported by the external source.
     * raw_count is the vote count from the source page — NEVER add to FanMeter totals.
     */
    record CandidateObservation(
        String sourceName,
        String sourceSlug,
        long rawCount,
        double sharePct,
        int rankPosition
    ) {}
}
