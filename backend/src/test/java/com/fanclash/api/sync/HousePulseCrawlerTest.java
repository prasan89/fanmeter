package com.fanclash.api.sync;

import com.fanclash.api.repository.*;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.*;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.mock;

/**
 * Unit tests for HousePulseCrawler HTML parsing and NominationSyncService name-matching.
 *
 * Tests run against saved HTML fixtures — no live HTTP calls, no Spring context.
 * Fixtures are in src/test/resources/fixtures/housepulse/.
 */
class HousePulseCrawlerTest {

    /** Injects a pre-loaded Document instead of making an HTTP request. */
    static class FixtureCrawler extends HousePulseCrawler {
        private final Document fixedDoc;
        FixtureCrawler(Document doc) { this.fixedDoc = doc; }

        @Override
        public HousePulseCrawler.CrawlResult fetchNominations(String url) {
            return parseDocument(url, fixedDoc);
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

    // ── Telugu Season 10 — real page fixture ──────────────────────────────────

    @Test
    @DisplayName("Telugu: extracts Week 5 with 7 nominees from current-nominations section")
    void teluguCurrentWeek() {
        HousePulseCrawler.CrawlResult r = new FixtureCrawler(teluguDoc)
            .fetchNominations("https://housepulse.in/shows/bigg-boss-telugu/season-10/nominations");
        assertThat(r.success()).isTrue();
        assertThat(r.weekNumber()).isEqualTo(5);
        assertThat(r.nominees()).hasSize(7);
    }

    @Test
    @DisplayName("Telugu: current nominees do not include history-only contestants")
    void teluguHistoryNotMixedIn() {
        HousePulseCrawler.CrawlResult r = new FixtureCrawler(teluguDoc).fetchNominations("url");
        List<String> slugs = r.nominees().stream().map(HousePulseCrawler.Nominee::housePulseSlug).toList();
        assertThat(slugs).containsExactlyInAnyOrder(
            "damera-shalini-patel", "rohit-naidu-patnam", "thrigun-adith-arun",
            "mahadev-charan-tej", "apoorva-tungaturthy", "aman-masud", "auto-ram-prasad"
        );
    }

    @Test
    @DisplayName("Telugu: each nominee has non-blank name, valid slug, and https image URL")
    void teluguNomineeFields() {
        HousePulseCrawler.CrawlResult r = new FixtureCrawler(teluguDoc).fetchNominations("url");
        for (HousePulseCrawler.Nominee n : r.nominees()) {
            assertThat(n.name()).isNotBlank();
            assertThat(n.housePulseSlug()).isNotBlank().matches("[a-z0-9-]+");
            assertThat(n.profileImageUrl()).isNotNull().startsWith("https://");
        }
    }

    @Test
    @DisplayName("Telugu: profile image URLs are from media.housepulse.in")
    void teluguProfileImages() {
        HousePulseCrawler.CrawlResult r = new FixtureCrawler(teluguDoc).fetchNominations("url");
        for (HousePulseCrawler.Nominee n : r.nominees()) {
            assertThat(n.profileImageUrl()).contains("media.housepulse.in");
        }
    }

    // ── Tamil Season 10 — synthetic fixture ───────────────────────────────────

    @Test
    @DisplayName("Tamil: extracts Week 6 with 8 nominees")
    void tamilCurrentWeek() {
        HousePulseCrawler.CrawlResult r = new FixtureCrawler(tamilDoc).fetchNominations("url");
        assertThat(r.success()).isTrue();
        assertThat(r.weekNumber()).isEqualTo(6);
        assertThat(r.nominees()).hasSize(8);
    }

    @Test
    @DisplayName("Tamil: history table nominees not merged into current list — count stays 8")
    void tamilHistoryNotMixedIn() {
        HousePulseCrawler.CrawlResult r = new FixtureCrawler(tamilDoc).fetchNominations("url");
        assertThat(r.nominees()).hasSize(8);
        assertThat(r.nominees().stream().map(HousePulseCrawler.Nominee::housePulseSlug).distinct()).hasSize(8);
    }

    @Test
    @DisplayName("Tamil: updated-at timestamp parsed from <time> element")
    void tamilUpdatedAt() {
        HousePulseCrawler.CrawlResult r = new FixtureCrawler(tamilDoc).fetchNominations("url");
        assertThat(r.sourceUpdatedAt()).isNotNull();
    }

    // ── No current nominations ─────────────────────────────────────────────────

    @Test
    @DisplayName("No-nominations page: CrawlResult.success() is false, not an empty-nominees success")
    void noNominationsReturnsFailure() {
        HousePulseCrawler.CrawlResult r = new FixtureCrawler(noNominationsDoc).fetchNominations("url");
        assertThat(r.success()).isFalse();
        assertThat(r.nominees()).isEmpty();
        assertThat(r.errorMessage()).isNotBlank();
    }

    // ── Contestant name matching ───────────────────────────────────────────────

    private NominationSyncService syncService() {
        return new NominationSyncService(
            mock(EvictionPollRepository.class),
            mock(EvictionNomineeRepository.class),
            mock(NominationSourceRepository.class),
            mock(NominationSyncLogRepository.class),
            mock(ContestantRepository.class),
            mock(SeasonRepository.class),
            new HousePulseCrawler(),
            mock(jakarta.persistence.EntityManager.class)
        );
    }

    @Test
    @DisplayName("Match: HousePulse slug directly resolves DB contestant")
    void matchBySlugDirect() {
        var db = List.of(
            contestant(1L, "Rohit Naidu Patnam", "rohit-naidu-patnam"),
            contestant(2L, "Aman Masud", "aman-masud")
        );
        var nominee = new HousePulseCrawler.Nominee("Rohit Naidu Patnam", "rohit-naidu-patnam",
            "https://media.housepulse.in/img.webp");
        var matches = syncService().matchNominees(List.of(nominee), db);
        assertThat(matches).hasSize(1);
        assertThat(matches.get(0).contestant()).isNotNull();
        assertThat(matches.get(0).contestant().getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Match: 'Mukesh K' resolves to DB contestant 'Mukesh' by name prefix")
    void matchByNamePrefix() {
        var db = List.of(contestant(1L, "Mukesh", "mukesh"));
        var nominee = new HousePulseCrawler.Nominee("Mukesh K", "mukesh-k", null);
        var matches = syncService().matchNominees(List.of(nominee), db);
        assertThat(matches).hasSize(1);
        assertThat(matches.get(0).contestant()).isNotNull();
    }

    @Test
    @DisplayName("Match: truly unknown name returns null contestant (not a false positive)")
    void unknownNameReturnsNull() {
        var db = List.of(contestant(1L, "Akshitha Ashok", "akshitha-ashok"));
        var nominee = new HousePulseCrawler.Nominee("Unknown Person XYZ", "unknown-person-xyz", null);
        var matches = syncService().matchNominees(List.of(nominee), db);
        assertThat(matches).hasSize(1);
        assertThat(matches.get(0).contestant()).isNull();
    }

    @Test
    @DisplayName("Match: 'Auto Ram Prasad' (HousePulse) resolves to 'Auto Ramprasad' (DB) via token")
    void matchTeluguVariant() {
        var db = List.of(contestant(1L, "Auto Ramprasad", "auto-ramprasad"));
        var nominee = new HousePulseCrawler.Nominee("Auto Ram Prasad", "auto-ram-prasad", null);
        var matches = syncService().matchNominees(List.of(nominee), db);
        assertThat(matches).hasSize(1);
        assertThat(matches.get(0).contestant()).isNotNull();
    }

    @Test
    @DisplayName("Season isolation: Telugu nominee slug not matched against Tamil contestant DB")
    void seasonIsolation() {
        var tamilDb = List.of(
            contestant(1L, "Akshitha Ashok", "akshitha-ashok"),
            contestant(2L, "Chandini Tamilarasan", "chandini-tamilarasan")
        );
        var teluguNominee = new HousePulseCrawler.Nominee("Rohit Naidu Patnam", "rohit-naidu-patnam", null);
        var matches = syncService().matchNominees(List.of(teluguNominee), tamilDb);
        assertThat(matches.get(0).contestant()).isNull();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Document loadFixture(String name) throws Exception {
        try (InputStream is = getClass().getResourceAsStream("/fixtures/housepulse/" + name)) {
            assertThat(is).as("Fixture file not found: " + name).isNotNull();
            return Jsoup.parse(new String(is.readAllBytes(), StandardCharsets.UTF_8),
                "https://housepulse.in");
        }
    }

    private com.fanclash.api.entity.Contestant contestant(Long id, String name, String slug) {
        var c = new com.fanclash.api.entity.Contestant();
        ReflectionTestUtils.setField(c, "id", id);
        c.setName(name);
        c.setSlug(slug);
        c.setStatus("active");
        return c;
    }
}
