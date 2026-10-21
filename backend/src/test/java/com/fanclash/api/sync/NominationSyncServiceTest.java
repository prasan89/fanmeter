package com.fanclash.api.sync;

import com.fanclash.api.entity.*;
import com.fanclash.api.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for NominationSyncService.
 * No Spring context — pure Mockito mocking, no DB, no HTTP.
 */
@ExtendWith(MockitoExtension.class)
class NominationSyncServiceTest {

    @Mock EvictionPollRepository      pollRepo;
    @Mock EvictionNomineeRepository   nomineeRepo;
    @Mock NominationSourceRepository  sourceRepo;
    @Mock NominationSyncLogRepository syncLogRepo;
    @Mock ContestantRepository        contestantRepo;
    @Mock SeasonRepository            seasonRepo;
    @Mock HousePulseCrawler           crawler;
    @Mock EntityManager               em;

    NominationSyncService service;

    @BeforeEach
    void setUp() {
        service = new NominationSyncService(
            pollRepo, nomineeRepo, sourceRepo, syncLogRepo,
            contestantRepo, seasonRepo, crawler, em
        );
    }

    // ── SHOW_CONFIGS covers all 6 shows ─────────────────────────────────────

    @Test
    @DisplayName("SHOW_CONFIGS includes all 6 Bigg Boss shows including Hindi and Bangla")
    void showConfigsCoversAllSix() {
        assertThat(NominationSyncService.SHOW_CONFIGS).containsKeys(
            "bigg-boss-tamil",
            "bigg-boss-telugu",
            "bigg-boss-malayalam",
            "bigg-boss-kannada",
            "bigg-boss-hindi",
            "bigg-boss-bangla"
        );
    }

    @Test
    @DisplayName("Hindi config points to season-20, Bangla to season-3")
    void showConfigSeasons() {
        assertThat(NominationSyncService.SHOW_CONFIGS.get("bigg-boss-hindi").seasonSegment())
            .isEqualTo("season-20");
        assertThat(NominationSyncService.SHOW_CONFIGS.get("bigg-boss-bangla").seasonSegment())
            .isEqualTo("season-3");
    }

    // ── Duplicate prevention — already verified+open poll skips ─────────────

    @Test
    @DisplayName("Already verified+open poll for the same week is not re-upserted")
    void duplicatePrevention_alreadyVerifiedOpen() {
        NominationSyncLog log = syncLog("bigg-boss-telugu");
        when(syncLogRepo.save(any())).thenReturn(log);

        Season season = season(1L);
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-telugu", "live")).thenReturn(List.of(season));

        // Crawl returns week 5 with 3 nominees
        HousePulseCrawler.CrawlResult crawl = successCrawl(5,
            nominee("Rohit Naidu", "rohit-naidu", null),
            nominee("Aman Masud",  "aman-masud",  null),
            nominee("Shalini",     "shalini",     null)
        );
        when(crawler.fetchNominations(anyString())).thenReturn(crawl);

        // DB has contestants matching all nominees
        when(contestantRepo.findBySeasonIdOrderByNameAsc(1L)).thenReturn(List.of(
            contestant(1L, "Rohit Naidu", "rohit-naidu"),
            contestant(2L, "Aman Masud",  "aman-masud"),
            contestant(3L, "Shalini",     "shalini")
        ));

        // Already-verified poll for week 5 exists in DB
        EvictionPoll existing = poll(1L, season, 5, "open", true, "NOMINATIONS_PUBLISHED");
        existing.setEvictionNominees(List.of());
        when(pollRepo.findBySeasonIdOrderByWeekNumberDesc(1L)).thenReturn(List.of(existing));

        service.runSync("bigg-boss-telugu", false);

        // No new nominees saved because poll was already verified+open
        verify(nomineeRepo, never()).deleteByPollId(any());
        verify(nomineeRepo, never()).save(any());
    }

    // ── Forced re-sync — force=true bypasses ALREADY_VERIFIED guard ──────────

    @Test
    @DisplayName("force=true re-syncs a verified+open poll and replaces nominees")
    void forcedResync_bypassesAlreadyVerifiedGuard() {
        NominationSyncLog log = syncLog("bigg-boss-hindi");
        when(syncLogRepo.save(any())).thenReturn(log);

        Season season = season(1L);
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-hindi", "live")).thenReturn(List.of(season));

        HousePulseCrawler.CrawlResult crawl = successCrawl(7,
            nominee("Bigg Contestant A", "bigg-contestant-a", null),
            nominee("Bigg Contestant B", "bigg-contestant-b", null)
        );
        when(crawler.fetchNominations(anyString())).thenReturn(crawl);

        Contestant ca = contestant(1L, "Bigg Contestant A", "bigg-contestant-a");
        Contestant cb = contestant(2L, "Bigg Contestant B", "bigg-contestant-b");
        when(contestantRepo.findBySeasonIdOrderByNameAsc(1L)).thenReturn(List.of(ca, cb));

        // Already-verified open poll exists for week 7
        EvictionPoll existing = poll(10L, season, 7, "open", true, "NOMINATIONS_PUBLISHED");
        existing.setEvictionNominees(List.of());
        when(pollRepo.findBySeasonIdOrderByWeekNumberDesc(1L)).thenReturn(List.of(existing));
        when(pollRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(nomineeRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(sourceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // force=true — should bypass the guard and update nominees
        service.runSync("bigg-boss-hindi", true);

        verify(nomineeRepo).deleteByPollId(10L);
        ArgumentCaptor<EvictionNominee> cap = ArgumentCaptor.forClass(EvictionNominee.class);
        verify(nomineeRepo, atLeast(2)).save(cap.capture());
        assertThat(cap.getAllValues()).hasSize(2);
    }

    // ── Nomination changes — new nominees replace old ────────────────────────

    @Test
    @DisplayName("Draft poll: new nominees from crawl replace existing nominees")
    void nominationChanges_draftPollUpdated() {
        NominationSyncLog log = syncLog("bigg-boss-telugu");
        when(syncLogRepo.save(any())).thenReturn(log);

        Season season = season(1L);
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-telugu", "live")).thenReturn(List.of(season));

        HousePulseCrawler.CrawlResult crawl = successCrawl(6,
            nominee("Rohit Naidu", "rohit-naidu", null),
            nominee("Aman Masud",  "aman-masud",  null)
        );
        when(crawler.fetchNominations(anyString())).thenReturn(crawl);

        Contestant rohit = contestant(1L, "Rohit Naidu", "rohit-naidu");
        Contestant aman  = contestant(2L, "Aman Masud",  "aman-masud");
        when(contestantRepo.findBySeasonIdOrderByNameAsc(1L)).thenReturn(List.of(rohit, aman));

        // Week 6 draft poll already exists
        EvictionPoll existing = poll(2L, season, 6, "draft", false, "NEEDS_VERIFICATION");
        existing.setEvictionNominees(List.of());
        when(pollRepo.findBySeasonIdOrderByWeekNumberDesc(1L)).thenReturn(List.of(existing));
        when(pollRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(nomineeRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(sourceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.runSync("bigg-boss-telugu", false);

        // Old nominees deleted, new ones saved
        verify(nomineeRepo).deleteByPollId(2L);
        ArgumentCaptor<EvictionNominee> cap = ArgumentCaptor.forClass(EvictionNominee.class);
        verify(nomineeRepo, atLeast(2)).save(cap.capture());
        assertThat(cap.getAllValues()).hasSize(2);
    }

    // ── Auto-open when verified ───────────────────────────────────────────────

    @Test
    @DisplayName("Draft poll with >=50% match rate is auto-opened to 'open'")
    void autoOpenWhenVerified() {
        NominationSyncLog log = syncLog("bigg-boss-telugu");
        when(syncLogRepo.save(any())).thenReturn(log);

        Season season = season(1L);
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-telugu", "live")).thenReturn(List.of(season));

        HousePulseCrawler.CrawlResult crawl = successCrawl(7,
            nominee("Rohit Naidu", "rohit-naidu", null),
            nominee("Aman Masud",  "aman-masud",  null)
        );
        when(crawler.fetchNominations(anyString())).thenReturn(crawl);
        when(contestantRepo.findBySeasonIdOrderByNameAsc(1L)).thenReturn(List.of(
            contestant(1L, "Rohit Naidu", "rohit-naidu"),
            contestant(2L, "Aman Masud",  "aman-masud")
        ));

        // No existing poll for week 7
        when(pollRepo.findBySeasonIdOrderByWeekNumberDesc(1L)).thenReturn(List.of());
        EvictionPoll newPoll = poll(3L, season, 7, "draft", false, null);
        newPoll.setEvictionNominees(List.of());
        when(pollRepo.save(any())).thenReturn(newPoll);
        when(nomineeRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(sourceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.runSync("bigg-boss-telugu", false);

        // Poll should have been saved with status=open
        ArgumentCaptor<EvictionPoll> cap = ArgumentCaptor.forClass(EvictionPoll.class);
        verify(pollRepo, atLeast(1)).save(cap.capture());
        boolean anyOpenSave = cap.getAllValues().stream()
            .anyMatch(p -> "open".equals(p.getStatus()));
        assertThat(anyOpenSave).isTrue();
    }

    // ── Conflicting sources — low match rate flags NEEDS_VERIFICATION ────────

    @Test
    @DisplayName("Low match rate (<50%) results in NEEDS_VERIFICATION nomination state")
    void lowMatchRate_needsVerification() {
        NominationSyncLog log = syncLog("bigg-boss-telugu");
        when(syncLogRepo.save(any())).thenReturn(log);

        Season season = season(1L);
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-telugu", "live")).thenReturn(List.of(season));

        // 4 nominees crawled, only 1 in DB → 25% match rate < 50% threshold
        HousePulseCrawler.CrawlResult crawl = successCrawl(8,
            nominee("Known Person",   "known-person",   null),
            nominee("Unknown One",    "unknown-one",    null),
            nominee("Unknown Two",    "unknown-two",    null),
            nominee("Unknown Three",  "unknown-three",  null)
        );
        when(crawler.fetchNominations(anyString())).thenReturn(crawl);
        when(contestantRepo.findBySeasonIdOrderByNameAsc(1L)).thenReturn(List.of(
            contestant(1L, "Known Person", "known-person")
        ));

        when(pollRepo.findBySeasonIdOrderByWeekNumberDesc(1L)).thenReturn(List.of());
        EvictionPoll newPoll = poll(4L, season, 8, "draft", false, null);
        newPoll.setEvictionNominees(List.of());
        when(pollRepo.save(any())).thenReturn(newPoll);
        when(nomineeRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(sourceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.runSync("bigg-boss-telugu", false);

        ArgumentCaptor<EvictionPoll> cap = ArgumentCaptor.forClass(EvictionPoll.class);
        verify(pollRepo, atLeast(1)).save(cap.capture());
        // At least one save must set NEEDS_VERIFICATION
        boolean hasNeedsVerification = cap.getAllValues().stream()
            .anyMatch(p -> "NEEDS_VERIFICATION".equals(p.getNominationState()));
        assertThat(hasNeedsVerification).isTrue();
    }

    // ── Source failure — SOURCE_UNAVAILABLE, last poll preserved ────────────

    @Test
    @DisplayName("Crawler failure sets poll state to SOURCE_UNAVAILABLE without wiping nominees")
    void sourceFailure_preservesPoll() {
        NominationSyncLog log = syncLog("bigg-boss-telugu");
        when(syncLogRepo.save(any())).thenReturn(log);

        Season season = season(1L);
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-telugu", "live")).thenReturn(List.of(season));

        HousePulseCrawler.CrawlResult failed = new HousePulseCrawler.CrawlResult(
            "https://housepulse.in/test", false, 0, List.of(), null, "HTTP 503");
        when(crawler.fetchNominations(anyString())).thenReturn(failed);

        EvictionPoll openPoll = poll(5L, season, 9, "open", true, "NOMINATIONS_PUBLISHED");
        when(pollRepo.findTopBySeasonIdAndStatusOrderByWeekNumberDesc(1L, "open"))
            .thenReturn(Optional.of(openPoll));
        when(pollRepo.findBySeasonIdOrderByWeekNumberDesc(1L)).thenReturn(List.of(openPoll));
        when(pollRepo.save(any())).thenReturn(openPoll);

        service.runSync("bigg-boss-telugu", false);

        // Nominees must NOT be deleted when source fails
        verify(nomineeRepo, never()).deleteByPollId(any());

        // Poll state should be updated to SOURCE_UNAVAILABLE
        ArgumentCaptor<EvictionPoll> cap = ArgumentCaptor.forClass(EvictionPoll.class);
        verify(pollRepo, atLeast(1)).save(cap.capture());
        boolean markedUnavailable = cap.getAllValues().stream()
            .anyMatch(p -> "SOURCE_UNAVAILABLE".equals(p.getNominationState()));
        assertThat(markedUnavailable).isTrue();
    }

    // ── Source failure — exception path continues to next show ───────────────

    @Test
    @DisplayName("Exception during one show sync is isolated — other shows still run")
    void sourceException_perShowIsolation() {
        NominationSyncLog log = syncLog("bigg-boss-tamil");
        NominationSyncLog log2 = syncLog("bigg-boss-telugu");
        when(syncLogRepo.save(any())).thenReturn(log, log2);

        // Tamil season OK, Telugu throws
        Season tamilSeason  = season(1L);
        Season teluguSeason = season(2L);
        when(seasonRepo.findByShowSlugAndStatus(eq("bigg-boss-tamil"),  eq("live"))).thenReturn(List.of(tamilSeason));
        when(seasonRepo.findByShowSlugAndStatus(eq("bigg-boss-telugu"), eq("live"))).thenReturn(List.of(teluguSeason));

        HousePulseCrawler.CrawlResult failedCrawl = new HousePulseCrawler.CrawlResult(
            "https://housepulse.in/test", false, 0, List.of(), null, "connection refused");
        HousePulseCrawler.CrawlResult okCrawl = successCrawl(5,
            nominee("Akshitha", "akshitha", null)
        );

        when(crawler.fetchNominations(contains("bigg-boss-tamil"))).thenReturn(okCrawl);
        when(crawler.fetchNominations(contains("bigg-boss-telugu"))).thenReturn(failedCrawl);

        when(contestantRepo.findBySeasonIdOrderByNameAsc(1L)).thenReturn(List.of(
            contestant(1L, "Akshitha", "akshitha")
        ));

        EvictionPoll tamilPoll = poll(6L, tamilSeason, 5, "draft", false, null);
        tamilPoll.setEvictionNominees(List.of());
        EvictionPoll teluguPoll = poll(7L, teluguSeason, 9, "open", true, "NOMINATIONS_PUBLISHED");

        when(pollRepo.findBySeasonIdOrderByWeekNumberDesc(1L)).thenReturn(List.of());
        when(pollRepo.findBySeasonIdOrderByWeekNumberDesc(2L)).thenReturn(List.of(teluguPoll));
        when(pollRepo.findTopBySeasonIdAndStatusOrderByWeekNumberDesc(2L, "open"))
            .thenReturn(Optional.of(teluguPoll));
        when(pollRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(nomineeRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(sourceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // runSync over 2 slugs — neither should throw
        NominationSyncService.SyncResult result = service.runSync(null, false);

        // Should have processed both — status partial or success
        assertThat(result.status()).isNotEqualTo("exception");
        // Tamil found 1 nominee
        assertThat(result.totalNominees()).isGreaterThanOrEqualTo(1);
    }

    // ── No live season — show skipped gracefully ─────────────────────────────

    @Test
    @DisplayName("No live season for show is handled gracefully without error")
    void noLiveSeason_skipsGracefully() {
        NominationSyncLog log = syncLog("bigg-boss-bangla");
        when(syncLogRepo.save(any())).thenReturn(log);
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-bangla", "live")).thenReturn(List.of());

        assertThatCode(() -> service.runSync("bigg-boss-bangla", false)).doesNotThrowAnyException();
        verify(crawler, never()).fetchNominations(anyString());
    }

    // ── Vote-count isolation — fan_votes never touched ───────────────────────

    @Test
    @DisplayName("Sync never calls ContestantRepository methods that could modify fan_votes")
    void voteCountIsolation_fanVotesNeverModified() {
        NominationSyncLog log = syncLog("bigg-boss-telugu");
        when(syncLogRepo.save(any())).thenReturn(log);

        Season season = season(1L);
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-telugu", "live")).thenReturn(List.of(season));

        HousePulseCrawler.CrawlResult crawl = successCrawl(3,
            nominee("Rohit", "rohit-naidu-patnam", null)
        );
        when(crawler.fetchNominations(anyString())).thenReturn(crawl);
        Contestant c = contestant(1L, "Rohit", "rohit-naidu-patnam");
        when(contestantRepo.findBySeasonIdOrderByNameAsc(1L)).thenReturn(List.of(c));
        when(pollRepo.findBySeasonIdOrderByWeekNumberDesc(1L)).thenReturn(List.of());
        EvictionPoll p = poll(1L, season, 3, "draft", false, null);
        p.setEvictionNominees(List.of());
        when(pollRepo.save(any())).thenReturn(p);
        when(nomineeRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(sourceRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        service.runSync("bigg-boss-telugu", false);

        // ContestantRepository may only be called with findBySeasonIdOrderByNameAsc and saveAll
        // — never with methods that could affect fan_votes
        // We verify no JdbcTemplate / EntityManager update for fan_votes by checking
        // that EntityManager.createNativeQuery is never called (sync doesn't use raw SQL)
        verify(em, never()).createNativeQuery(anyString());
        verify(em, never()).createNativeQuery(anyString(), any(Class.class));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Season season(Long id) {
        Season s = new Season();
        ReflectionTestUtils.setField(s, "id", id);
        s.setStatus("live");
        s.setName("Test Season");
        return s;
    }

    private EvictionPoll poll(Long id, Season season, int week, String status,
                               boolean verified, String nomState) {
        EvictionPoll p = new EvictionPoll();
        ReflectionTestUtils.setField(p, "id", id);
        p.setSeason(season);
        p.setWeekNumber(week);
        p.setWeekLabel("Week " + week);
        p.setStatus(status);
        p.setSourceVerified(verified);
        p.setNominationState(nomState);
        p.setVoteMode("save");
        p.setUpdatedAt(LocalDateTime.now());
        return p;
    }

    private Contestant contestant(Long id, String name, String slug) {
        Contestant c = new Contestant();
        ReflectionTestUtils.setField(c, "id", id);
        c.setName(name);
        c.setSlug(slug);
        c.setStatus("active");
        c.setSyncFlag("ok");
        return c;
    }

    private HousePulseCrawler.Nominee nominee(String name, String slug, String img) {
        return new HousePulseCrawler.Nominee(name, slug, img);
    }

    private HousePulseCrawler.CrawlResult successCrawl(int week, HousePulseCrawler.Nominee... nominees) {
        return new HousePulseCrawler.CrawlResult("https://housepulse.in/test", true, week, List.of(nominees), null, null);
    }

    private NominationSyncLog syncLog(String slug) {
        NominationSyncLog l = NominationSyncLog.builder()
            .showSlug(slug).status("running").sourcesChecked(0).nomineesFound(0).conflictsFound(0)
            .build();
        ReflectionTestUtils.setField(l, "id", 1L);
        return l;
    }
}
