package com.fanclash.api.sentiment;

import com.fanclash.api.sentiment.adapter.SentimentSourceAdapter;
import com.fanclash.api.sentiment.entity.*;
import com.fanclash.api.sentiment.repository.*;
import com.fanclash.api.sentiment.service.SentimentCalculationService;
import com.fanclash.api.sentiment.service.SentimentIngestionService;
import com.fanclash.api.entity.Contestant;
import com.fanclash.api.entity.Season;
import com.fanclash.api.repository.ContestantFavouriteCountRepository;
import com.fanclash.api.repository.ContestantRepository;
import com.fanclash.api.repository.SeasonRepository;
import org.junit.jupiter.api.*;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for SentimentCalculationService.
 *
 * Verifies the E_c formula:
 *   p_s_c = x_s_c / sum(x_s_j)
 *   E_c   = 100 * sum(w_s * p_s_c) / sum(w_s)
 */
class SentimentCalculationServiceTest {

    private SentimentCalculationService service;

    private SentimentSourceRepository sourceRepo;
    private SentimentPollRepository pollRepo;
    private SentimentObservationRepository obsRepo;
    private SentimentScoreSnapshotRepository snapshotRepo;
    private ContestantFavouriteCountRepository favRepo;
    private ContestantRepository contestantRepo;
    private SeasonRepository seasonRepo;

    @BeforeEach
    void setUp() {
        sourceRepo   = mock(SentimentSourceRepository.class);
        pollRepo     = mock(SentimentPollRepository.class);
        obsRepo      = mock(SentimentObservationRepository.class);
        snapshotRepo = mock(SentimentScoreSnapshotRepository.class);
        favRepo      = mock(ContestantFavouriteCountRepository.class);
        contestantRepo = mock(ContestantRepository.class);
        seasonRepo   = mock(SeasonRepository.class);

        service = new SentimentCalculationService(
            sourceRepo, pollRepo, obsRepo, snapshotRepo, favRepo, contestantRepo, seasonRepo
        );
    }

    // ── Formula correctness ───────────────────────────────────────────────────

    @Test
    @DisplayName("External score formula: two contestants, one source, equal shares → score = 50 each")
    void formulaEqualShares() {
        // Two contestants, rawCounts 1 and 1 → shares 0.5 each → scores 50 each
        SentimentSource source = source(1L, BigDecimal.ONE);
        Contestant cA = contestant(10L, "Alice", "alice");
        Contestant cB = contestant(11L, "Bob", "bob");

        SentimentPoll poll = poll(1L, source, "bigg-boss-telugu", "Week 5");

        SentimentObservation obsA = obs(1L, poll, cA, 1L);
        SentimentObservation obsB = obs(2L, poll, cB, 1L);

        when(pollRepo.findByShowSlugOrderByFetchedAtDesc("bigg-boss-telugu"))
            .thenReturn(List.of(poll));
        when(pollRepo.findByShowSlugAndPeriodLabelOrderByFetchedAtDesc("bigg-boss-telugu", "Week 5"))
            .thenReturn(List.of(poll));
        when(obsRepo.findByPollId(1L)).thenReturn(List.of(obsA, obsB));
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-telugu", "live"))
            .thenReturn(List.of(season(1L)));
        when(favRepo.findTotalNative(1L, 10L)).thenReturn(0L);
        when(favRepo.findTotalNative(1L, 11L)).thenReturn(0L);
        when(contestantRepo.findById(10L)).thenReturn(Optional.of(cA));
        when(contestantRepo.findById(11L)).thenReturn(Optional.of(cB));
        when(snapshotRepo.findByShowSlugAndContestantIdAndPeriodLabel(anyString(), anyLong(), anyString()))
            .thenReturn(Optional.empty());
        when(snapshotRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SentimentCalculationService.ComputeResult result = service.computeScores("bigg-boss-telugu", "Week 5");

        assertThat(result.error()).isNull();
        assertThat(result.snapshotsSaved()).isEqualTo(2);

        // Capture saved snapshots
        var snapshots = new ArrayList<SentimentScoreSnapshot>();
        verify(snapshotRepo, times(2)).save(argThat(s -> {
            snapshots.add(s);
            return true;
        }));

        for (var snap : snapshots) {
            // external score = 100 * (1 * 0.5) / 1 = 50.0
            assertThat(snap.getExternalScore()).isEqualByComparingTo(BigDecimal.valueOf(50));
        }
    }

    @Test
    @DisplayName("External score formula: 3+1 split → scores 75 and 25")
    void formulaUnequalShares() {
        SentimentSource source = source(1L, BigDecimal.ONE);
        Contestant cA = contestant(10L, "Alice", "alice");
        Contestant cB = contestant(11L, "Bob", "bob");

        SentimentPoll poll = poll(1L, source, "bigg-boss-telugu", "Week 5");
        SentimentObservation obsA = obs(1L, poll, cA, 3L);  // 75%
        SentimentObservation obsB = obs(2L, poll, cB, 1L);  // 25%

        setupStubsForTwoContestants(poll, cA, cB, obsA, obsB);

        var snapshots = new ArrayList<SentimentScoreSnapshot>();
        when(snapshotRepo.save(any())).thenAnswer(inv -> {
            snapshots.add(inv.getArgument(0));
            return inv.getArgument(0);
        });

        service.computeScores("bigg-boss-telugu", "Week 5");

        var byContestant = new HashMap<Long, SentimentScoreSnapshot>();
        for (var s : snapshots) {
            byContestant.put(s.getContestant().getId(), s);
        }

        assertThat(byContestant.get(10L).getExternalScore())
            .isEqualByComparingTo(BigDecimal.valueOf(75));
        assertThat(byContestant.get(11L).getExternalScore())
            .isEqualByComparingTo(BigDecimal.valueOf(25));
    }

    @Test
    @DisplayName("Vote integrity: FanMeter votes read-only — no writes to favourite_counts")
    void voteIntegrity_noWriteToFavouriteCounts() {
        SentimentSource source = source(1L, BigDecimal.ONE);
        Contestant cA = contestant(10L, "Alice", "alice");
        SentimentPoll poll = poll(1L, source, "bigg-boss-telugu", "Week 5");
        SentimentObservation obsA = obs(1L, poll, cA, 1L);

        when(pollRepo.findByShowSlugOrderByFetchedAtDesc("bigg-boss-telugu")).thenReturn(List.of(poll));
        when(pollRepo.findByShowSlugAndPeriodLabelOrderByFetchedAtDesc("bigg-boss-telugu", "Week 5")).thenReturn(List.of(poll));
        when(obsRepo.findByPollId(1L)).thenReturn(List.of(obsA));
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-telugu", "live")).thenReturn(List.of(season(1L)));
        when(favRepo.findTotalNative(1L, 10L)).thenReturn(5000L);
        when(contestantRepo.findById(10L)).thenReturn(Optional.of(cA));
        when(snapshotRepo.findByShowSlugAndContestantIdAndPeriodLabel(any(), any(), any())).thenReturn(Optional.empty());
        when(snapshotRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.computeScores("bigg-boss-telugu", "Week 5");

        // The only method that writes to favourite_counts is atomicIncrement — verify it was never called
        verify(favRepo, never()).atomicIncrement(anyLong(), anyLong());
        // save() was never called on favourite count repo
        verify(favRepo, never()).save(any());
        verify(favRepo, never()).saveAll(any());
    }

    @Test
    @DisplayName("No polls for show: returns error, no snapshots saved")
    void noPollsReturnsError() {
        when(pollRepo.findByShowSlugOrderByFetchedAtDesc("bigg-boss-bangla")).thenReturn(List.of());
        SentimentCalculationService.ComputeResult result = service.computeScores("bigg-boss-bangla", null);
        assertThat(result.error()).isNotNull();
        assertThat(result.snapshotsSaved()).isEqualTo(0);
        verify(snapshotRepo, never()).save(any());
    }

    @Test
    @DisplayName("Combined score = average of external score and fanmeter share×100")
    void combinedScoreFormula() {
        SentimentSource source = source(1L, BigDecimal.ONE);
        Contestant cA = contestant(10L, "Alice", "alice");
        SentimentPoll poll = poll(1L, source, "bigg-boss-telugu", "Week 5");
        SentimentObservation obsA = obs(1L, poll, cA, 1L); // 100% external

        when(pollRepo.findByShowSlugOrderByFetchedAtDesc("bigg-boss-telugu")).thenReturn(List.of(poll));
        when(pollRepo.findByShowSlugAndPeriodLabelOrderByFetchedAtDesc("bigg-boss-telugu", "Week 5")).thenReturn(List.of(poll));
        when(obsRepo.findByPollId(1L)).thenReturn(List.of(obsA));
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-telugu", "live")).thenReturn(List.of(season(1L)));
        when(favRepo.findTotalNative(1L, 10L)).thenReturn(1000L); // all FanMeter votes go to this contestant
        when(contestantRepo.findById(10L)).thenReturn(Optional.of(cA));
        when(snapshotRepo.findByShowSlugAndContestantIdAndPeriodLabel(any(), any(), any())).thenReturn(Optional.empty());

        var snapshots = new ArrayList<SentimentScoreSnapshot>();
        when(snapshotRepo.save(any())).thenAnswer(inv -> {
            snapshots.add(inv.getArgument(0));
            return inv.getArgument(0);
        });

        service.computeScores("bigg-boss-telugu", "Week 5");

        assertThat(snapshots).hasSize(1);
        var snap = snapshots.get(0);
        // external = 100 (only contestant), fanmeter share = 100%, combined = (100+100)/2 = 100
        assertThat(snap.getExternalScore()).isEqualByComparingTo(BigDecimal.valueOf(100));
        assertThat(snap.getCombinedScore()).isEqualByComparingTo(BigDecimal.valueOf(100));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void setupStubsForTwoContestants(SentimentPoll poll, Contestant cA, Contestant cB,
                                              SentimentObservation obsA, SentimentObservation obsB) {
        when(pollRepo.findByShowSlugOrderByFetchedAtDesc("bigg-boss-telugu")).thenReturn(List.of(poll));
        when(pollRepo.findByShowSlugAndPeriodLabelOrderByFetchedAtDesc("bigg-boss-telugu", "Week 5")).thenReturn(List.of(poll));
        when(obsRepo.findByPollId(1L)).thenReturn(List.of(obsA, obsB));
        when(seasonRepo.findByShowSlugAndStatus("bigg-boss-telugu", "live")).thenReturn(List.of(season(1L)));
        when(favRepo.findTotalNative(1L, 10L)).thenReturn(0L);
        when(favRepo.findTotalNative(1L, 11L)).thenReturn(0L);
        when(contestantRepo.findById(10L)).thenReturn(Optional.of(cA));
        when(contestantRepo.findById(11L)).thenReturn(Optional.of(cB));
        when(snapshotRepo.findByShowSlugAndContestantIdAndPeriodLabel(anyString(), anyLong(), anyString())).thenReturn(Optional.empty());
    }

    private SentimentSource source(Long id, BigDecimal weight) {
        SentimentSource s = new SentimentSource();
        ReflectionTestUtils.setField(s, "id", id);
        s.setSourceKey("housepulse");
        s.setDisplayName("HousePulse");
        s.setWeight(weight);
        s.setEnabled(true);
        s.setRobotsCompliant(true);
        s.setBaseUrl("https://housepulse.in");
        s.setAdapterClass("com.fanclash.api.sentiment.adapter.HousePulseSentimentAdapter");
        return s;
    }

    private Contestant contestant(Long id, String name, String slug) {
        Contestant c = new Contestant();
        ReflectionTestUtils.setField(c, "id", id);
        c.setName(name);
        c.setSlug(slug);
        c.setStatus("active");
        return c;
    }

    private SentimentPoll poll(Long id, SentimentSource source, String showSlug, String periodLabel) {
        SentimentPoll p = new SentimentPoll();
        ReflectionTestUtils.setField(p, "id", id);
        p.setSource(source);
        p.setShowSlug(showSlug);
        p.setPeriodLabel(periodLabel);
        p.setPeriodWeek(5);
        p.setFetchedAt(OffsetDateTime.now());
        return p;
    }

    private SentimentObservation obs(Long id, SentimentPoll poll, Contestant contestant, long rawCount) {
        SentimentObservation o = new SentimentObservation();
        ReflectionTestUtils.setField(o, "id", id);
        o.setPoll(poll);
        o.setContestant(contestant);
        o.setSourceName(contestant.getName());
        o.setSourceSlug(contestant.getSlug());
        o.setRawCount(rawCount);
        o.setResolved(true);
        o.setNeedsReview(false);
        return o;
    }

    private Season season(Long id) {
        Season s = new Season();
        ReflectionTestUtils.setField(s, "id", id);
        s.setStatus("live");
        return s;
    }
}
