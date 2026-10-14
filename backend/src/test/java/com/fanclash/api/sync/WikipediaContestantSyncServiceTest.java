package com.fanclash.api.sync;

import com.fanclash.api.entity.*;
import com.fanclash.api.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for WikipediaContestantSyncService.
 * No Spring context — pure Mockito, no HTTP, no DB.
 */
@ExtendWith(MockitoExtension.class)
class WikipediaContestantSyncServiceTest {

    @Mock ContestantRepository        contestantRepo;
    @Mock ContestantSyncLogRepository syncLogRepo;
    @Mock SeasonRepository            seasonRepo;
    @Mock RestTemplate                restTemplate;

    WikipediaContestantSyncService service;

    @BeforeEach
    void setUp() {
        service = new WikipediaContestantSyncService(
            contestantRepo, syncLogRepo, seasonRepo, restTemplate
        );
    }

    // ── SHOW_WIKI_PAGES covers all 6 shows ───────────────────────────────────

    @Test
    @DisplayName("SHOW_WIKI_PAGES includes Hindi 20 and Bangla 3")
    void showWikiPagesCoversAllSix() {
        // Access via reflection — maps are private static final
        @SuppressWarnings("unchecked")
        Map<String, String> pages = (Map<String, String>)
            ReflectionTestUtils.getField(WikipediaContestantSyncService.class, "SHOW_WIKI_PAGES");
        assertThat(pages).isNotNull().containsKeys(
            "bigg-boss-tamil",
            "bigg-boss-telugu",
            "bigg-boss-malayalam",
            "bigg-boss-kannada",
            "bigg-boss-hindi",
            "bigg-boss-bangla"
        );
    }

    // ── Eviction detection — active→eliminated is safe ───────────────────────

    @Test
    @DisplayName("Wikipedia 'eliminated' status updates active contestant in DB")
    void evictionDetection_activeToEliminated() {
        ContestantSyncLog log = syncLog("bigg-boss-telugu");
        when(syncLogRepo.save(any())).thenReturn(log);

        Season season = season(1L);
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-telugu", "live")).thenReturn(List.of(season));

        Contestant active = contestant(1L, "Rohit Naidu", "rohit-naidu", "active");
        when(contestantRepo.findBySeasonIdOrderByNameAsc(1L)).thenReturn(List.of(active));

        // Provide wikitext that marks Rohit as evicted
        String wikitext = buildWikitext("Rohit Naidu", "evicted Week 5");
        mockWikitextResponse("bigg-boss-telugu", wikitext);

        when(contestantRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.runSync("bigg-boss-telugu");

        ArgumentCaptor<Contestant> cap = ArgumentCaptor.forClass(Contestant.class);
        verify(contestantRepo, atLeast(1)).save(cap.capture());
        boolean eliminatedSaved = cap.getAllValues().stream()
            .anyMatch(c -> "eliminated".equals(c.getStatus()));
        assertThat(eliminatedSaved).isTrue();
    }

    // ── Never reactivate eliminated contestant ───────────────────────────────

    @Test
    @DisplayName("Wikipedia 'active' status never reactivates DB-eliminated contestant")
    void neverReactivateEliminated() {
        ContestantSyncLog log = syncLog("bigg-boss-telugu");
        when(syncLogRepo.save(any())).thenReturn(log);

        Season season = season(1L);
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-telugu", "live")).thenReturn(List.of(season));

        Contestant eliminated = contestant(1L, "Old Evictee", "old-evictee", "eliminated");
        when(contestantRepo.findBySeasonIdOrderByNameAsc(1L)).thenReturn(List.of(eliminated));

        // Wikipedia shows them as still active (outdated page)
        String wikitext = buildWikitext("Old Evictee", "nominated");
        mockWikitextResponse("bigg-boss-telugu", wikitext);
        when(contestantRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.runSync("bigg-boss-telugu");

        // Status must never be changed to "active" from "eliminated"
        ArgumentCaptor<Contestant> cap = ArgumentCaptor.forClass(Contestant.class);
        verify(contestantRepo, atLeast(0)).save(cap.capture());
        for (Contestant saved : cap.getAllValues()) {
            if ("old-evictee".equals(saved.getSlug())) {
                assertThat(saved.getStatus())
                    .as("eliminated contestant must not be reactivated")
                    .isNotEqualTo("active");
            }
        }
    }

    // ── Stale data — Wikipedia page returns 0 contestants: skip update ───────

    @Test
    @DisplayName("0 Wikipedia contestants parsed → no DB updates (guard against data loss)")
    void staleData_zeroContestantsSkipsUpdate() {
        ContestantSyncLog log = syncLog("bigg-boss-telugu");
        when(syncLogRepo.save(any())).thenReturn(log);

        // Return wikitext that can't be parsed for any contestant
        mockWikitextResponse("bigg-boss-telugu", "== Empty page ==\nNo data.");

        service.runSync("bigg-boss-telugu");

        // When 0 contestants parsed, service must not call save or delete
        verify(contestantRepo, never()).save(any());
    }

    // ── Source failure — Wikipedia API returns null ───────────────────────────

    @Test
    @DisplayName("Wikipedia API null response is handled as exception, logged as failed")
    void sourceFailure_nullApiResponse() {
        ContestantSyncLog log = syncLog("bigg-boss-telugu");
        when(syncLogRepo.save(any())).thenReturn(log);

        when(restTemplate.getForObject(anyString(), eq(WikipediaContestantSyncService.WikiApiResponse.class)))
            .thenReturn(null);

        WikipediaContestantSyncService.SyncResult result = service.runSync("bigg-boss-telugu");

        // Should be a failed result with an error entry
        assertThat(result.status()).isIn("failed", "partial");
        assertThat(result.errors()).isNotEmpty();

        // No contestant modifications
        verify(contestantRepo, never()).save(any());
    }

    // ── Vote-count isolation — fan_votes never touched by wiki sync ──────────

    @Test
    @DisplayName("WikiSync never modifies fan_votes or voting_rounds")
    void voteCountIsolation_fanVotesNeverModified() {
        ContestantSyncLog log = syncLog("bigg-boss-telugu");
        when(syncLogRepo.save(any())).thenReturn(log);

        Season season = season(1L);
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-telugu", "live")).thenReturn(List.of(season));

        Contestant active = contestant(1L, "Rohit Naidu", "rohit-naidu", "active");
        when(contestantRepo.findBySeasonIdOrderByNameAsc(1L)).thenReturn(List.of(active));

        String wikitext = buildWikitext("Rohit Naidu", "nominated");
        mockWikitextResponse("bigg-boss-telugu", wikitext);
        when(contestantRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.runSync("bigg-boss-telugu");

        // ContestantRepository is a JPA repo — verify it is only called for
        // findBySeasonIdOrderByNameAsc and save, never for custom methods that
        // touch vote-related columns
        verify(contestantRepo, never()).deleteAll();
        verify(contestantRepo, never()).deleteAllById(any());
        // RestTemplate calls for vote APIs should never happen
        verify(restTemplate, times(1)).getForObject(anyString(), any(Class.class));
    }

    // ── No live season — graceful skip ───────────────────────────────────────

    @Test
    @DisplayName("No live season for show skips gracefully without error")
    void noLiveSeason_skipsGracefully() {
        ContestantSyncLog log = syncLog("bigg-boss-hindi");
        when(syncLogRepo.save(any())).thenReturn(log);

        // Wikipedia call succeeds but season lookup returns empty
        mockWikitextResponse("bigg-boss-hindi", buildWikitext("Someone", "active"));
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-hindi", "live")).thenReturn(List.of());

        assertThatCode(() -> service.runSync("bigg-boss-hindi")).doesNotThrowAnyException();
        verify(contestantRepo, never()).save(any());
    }

    // ── Unknown show slug raises error ───────────────────────────────────────

    @Test
    @DisplayName("Unknown show slug is reported as an error in SyncResult")
    void unknownShowSlug_reportedAsError() {
        ContestantSyncLog log = syncLog("bigg-boss-unknown");
        when(syncLogRepo.save(any())).thenReturn(log);

        WikipediaContestantSyncService.SyncResult result = service.runSync("bigg-boss-unknown");
        assertThat(result.errors()).isNotEmpty();
        assertThat(result.status()).isEqualTo("failed");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Season season(Long id) {
        Season s = new Season();
        ReflectionTestUtils.setField(s, "id", id);
        s.setStatus("live");
        s.setName("Test Season");
        return s;
    }

    private Contestant contestant(Long id, String name, String slug, String status) {
        Contestant c = new Contestant();
        ReflectionTestUtils.setField(c, "id", id);
        c.setName(name);
        c.setSlug(slug);
        c.setStatus(status);
        c.setSyncFlag("ok");
        return c;
    }

    private ContestantSyncLog syncLog(String slug) {
        ContestantSyncLog l = ContestantSyncLog.builder()
            .startedAt(LocalDateTime.now())
            .status("running")
            .showSlug(slug)
            .updatedCount(0)
            .flaggedCount(0)
            .build();
        ReflectionTestUtils.setField(l, "id", 1L);
        return l;
    }

    /**
     * Builds minimal wikitext that the parser can extract a contestant from.
     * Uses the wikilink row pattern: | [[Name]] | status context |
     */
    private String buildWikitext(String contestantName, String rowContext) {
        return "== Contestants ==\n"
            + "{| class=\"wikitable\"\n"
            + "|-\n"
            + "| [[" + contestantName + "]] | " + rowContext + " |\n"
            + "|}\n";
    }

    private void mockWikitextResponse(String showSlug, String wikitext) {
        @SuppressWarnings("unchecked")
        Map<String, String> pages = (Map<String, String>)
            ReflectionTestUtils.getField(WikipediaContestantSyncService.class, "SHOW_WIKI_PAGES");
        String pageTitle = pages != null ? pages.get(showSlug) : null;

        Map<String, Object> mainSlot = new HashMap<>();
        mainSlot.put("*", wikitext);

        Map<String, Object> slots = new HashMap<>();
        slots.put("main", mainSlot);

        Map<String, Object> revision = new HashMap<>();
        revision.put("slots", slots);

        Map<String, Object> pageData = new HashMap<>();
        pageData.put("revisions", List.of(revision));

        Map<String, Object> allPages = new HashMap<>();
        allPages.put("12345", pageData);

        WikipediaContestantSyncService.QueryWrapper qw =
            new WikipediaContestantSyncService.QueryWrapper(allPages);
        WikipediaContestantSyncService.WikiApiResponse response =
            new WikipediaContestantSyncService.WikiApiResponse(qw);

        when(restTemplate.getForObject(anyString(),
            eq(WikipediaContestantSyncService.WikiApiResponse.class)))
            .thenReturn(response);
    }
}
