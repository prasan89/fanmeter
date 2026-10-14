package com.fanclash.api.sentiment;

import com.fanclash.api.sentiment.adapter.HousePulseSentimentAdapter;
import com.fanclash.api.sentiment.adapter.SentimentSourceAdapter;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.*;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for HousePulseSentimentAdapter HTML parsing.
 * Reuses existing HousePulse fixtures — no live HTTP calls.
 */
class HousePulseSentimentAdapterTest {

    static class FixtureAdapter extends HousePulseSentimentAdapter {
        private final Document fixedDoc;
        private final int httpStatus;

        FixtureAdapter(Document doc, int httpStatus) {
            this.fixedDoc = doc;
            this.httpStatus = httpStatus;
        }

        @Override
        public SentimentSourceAdapter.FetchResult fetchPoll(String showSlug, String pollUrl) {
            return parseDocument(showSlug, pollUrl, fixedDoc, httpStatus);
        }
    }

    private Document teluguDoc;
    private Document tamilDoc;
    private Document noNominationsDoc;

    @BeforeEach
    void loadFixtures() throws Exception {
        teluguDoc        = loadFixture("telugu-season10-nominations.html");
        tamilDoc         = loadFixture("tamil-season10-nominations.html");
        noNominationsDoc = loadFixture("no-current-nominations.html");
    }

    // ── Source key ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("getSourceKey returns 'housepulse'")
    void sourceKey() {
        assertThat(new HousePulseSentimentAdapter().getSourceKey()).isEqualTo("housepulse");
    }

    @Test
    @DisplayName("buildPollUrl constructs correct URL")
    void buildPollUrl() {
        String url = new HousePulseSentimentAdapter().buildPollUrl("bigg-boss-telugu", "season-10");
        assertThat(url).isEqualTo("https://housepulse.in/shows/bigg-boss-telugu/season-10/nominations");
    }

    // ── Telugu fixture ────────────────────────────────────────────────────────

    @Test
    @DisplayName("Telugu: FetchResult is successful")
    void teluguSuccess() {
        SentimentSourceAdapter.FetchResult r = new FixtureAdapter(teluguDoc, 200)
            .fetchPoll("bigg-boss-telugu", "url");
        assertThat(r.success()).isTrue();
        assertThat(r.errorMessage()).isNull();
        assertThat(r.httpStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("Telugu: period label is 'Week 5'")
    void teluguPeriodLabel() {
        SentimentSourceAdapter.FetchResult r = new FixtureAdapter(teluguDoc, 200)
            .fetchPoll("bigg-boss-telugu", "url");
        assertThat(r.periodLabel()).isEqualTo("Week 5");
        assertThat(r.periodWeek()).isEqualTo(5);
    }

    @Test
    @DisplayName("Telugu: 7 observations returned (one per nominee)")
    void teluguObservationCount() {
        SentimentSourceAdapter.FetchResult r = new FixtureAdapter(teluguDoc, 200)
            .fetchPoll("bigg-boss-telugu", "url");
        assertThat(r.observations()).hasSize(7);
    }

    @Test
    @DisplayName("Telugu: observations have non-blank sourceName and sourceSlug")
    void teluguObservationFields() {
        SentimentSourceAdapter.FetchResult r = new FixtureAdapter(teluguDoc, 200)
            .fetchPoll("bigg-boss-telugu", "url");
        for (SentimentSourceAdapter.CandidateObservation obs : r.observations()) {
            assertThat(obs.sourceName()).isNotBlank();
            assertThat(obs.sourceSlug()).isNotBlank().matches("[a-z0-9-]+");
            assertThat(obs.rawCount()).isGreaterThanOrEqualTo(1);
        }
    }

    @Test
    @DisplayName("Telugu: rank positions are sequential from 1")
    void teluguRankPositions() {
        SentimentSourceAdapter.FetchResult r = new FixtureAdapter(teluguDoc, 200)
            .fetchPoll("bigg-boss-telugu", "url");
        List<Integer> ranks = r.observations().stream()
            .map(SentimentSourceAdapter.CandidateObservation::rankPosition)
            .sorted()
            .toList();
        for (int i = 0; i < ranks.size(); i++) {
            assertThat(ranks.get(i)).isEqualTo(i + 1);
        }
    }

    @Test
    @DisplayName("Telugu: equal-share fallback — each rawCount is 1 when no explicit percentage data")
    void teluguEqualShareFallback() {
        SentimentSourceAdapter.FetchResult r = new FixtureAdapter(teluguDoc, 200)
            .fetchPoll("bigg-boss-telugu", "url");
        // HousePulse nominations page does not expose vote counts — equal-share gives rawCount=1 each
        long sumCounts = r.observations().stream().mapToLong(SentimentSourceAdapter.CandidateObservation::rawCount).sum();
        assertThat(sumCounts).isEqualTo(r.observations().size()); // 7 nominees × 1 each = 7
    }

    // ── Tamil fixture ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("Tamil: period label is 'Week 6'")
    void tamilPeriodLabel() {
        SentimentSourceAdapter.FetchResult r = new FixtureAdapter(tamilDoc, 200)
            .fetchPoll("bigg-boss-tamil", "url");
        assertThat(r.periodLabel()).isEqualTo("Week 6");
    }

    @Test
    @DisplayName("Tamil: 8 observations returned")
    void tamilObservationCount() {
        SentimentSourceAdapter.FetchResult r = new FixtureAdapter(tamilDoc, 200)
            .fetchPoll("bigg-boss-tamil", "url");
        assertThat(r.observations()).hasSize(8);
    }

    // ── Failure cases ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("No-nominations page: success=false, observations empty")
    void noNominationsFailure() {
        SentimentSourceAdapter.FetchResult r = new FixtureAdapter(noNominationsDoc, 200)
            .fetchPoll("bigg-boss-telugu", "url");
        assertThat(r.success()).isFalse();
        assertThat(r.observations()).isEmpty();
        assertThat(r.errorMessage()).isNotBlank();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private Document loadFixture(String name) throws Exception {
        try (InputStream is = getClass().getResourceAsStream("/fixtures/housepulse/" + name)) {
            assertThat(is).as("Fixture not found: " + name).isNotNull();
            return Jsoup.parse(new String(is.readAllBytes(), StandardCharsets.UTF_8),
                "https://housepulse.in");
        }
    }
}
