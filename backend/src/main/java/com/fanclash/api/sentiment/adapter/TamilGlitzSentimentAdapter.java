package com.fanclash.api.sentiment.adapter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Adapter stub for TamilGlitz weekly fan polls (Tamil-only).
 *
 * Status: DISABLED until:
 * 1. robots.txt and Terms of Service verified for scraping
 * 2. Page structure manually inspected and fixture captured
 * 3. sentiment_sources.enabled set to TRUE by admin
 *
 * When enabling: implement fetchPoll() to parse TamilGlitz poll page,
 * extract contestant names and vote percentages, and return a FetchResult.
 */
@Slf4j
@Component
public class TamilGlitzSentimentAdapter implements SentimentSourceAdapter {

    private static final String SOURCE_KEY = "tamilglitz";

    @Override
    public String getSourceKey() {
        return SOURCE_KEY;
    }

    @Override
    public String buildPollUrl(String showSlug, String seasonSegment) {
        return "https://tamilglitz.in/bigg-boss-tamil-vote-results";
    }

    @Override
    public FetchResult fetchPoll(String showSlug, String pollUrl) {
        log.warn("[TamilGlitz] Adapter is disabled — enable after robots.txt verification");
        return FetchResult.failure("adapter disabled — not yet verified for scraping", -1);
    }
}
