package com.fanclash.api.sentiment.service;

import com.fanclash.api.entity.Contestant;
import com.fanclash.api.entity.Season;
import com.fanclash.api.repository.ContestantRepository;
import com.fanclash.api.repository.SeasonRepository;
import com.fanclash.api.sentiment.adapter.SentimentSourceAdapter;
import com.fanclash.api.sentiment.entity.*;
import com.fanclash.api.sentiment.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Fetches external fan poll signals every 6 hours and stores them in the sentiment tables.
 *
 * INTEGRITY RULE: External raw_count values are NEVER added to fan_votes or
 * contestant_favourite_counts. This service only writes to sentiment_* tables.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SentimentIngestionService {

    /** Season segment for each show slug — mirrors NominationSyncService.SHOW_CONFIGS */
    static final Map<String, String> SEASON_SEGMENTS = Map.of(
        "bigg-boss-tamil",     "season-10",
        "bigg-boss-telugu",    "season-10",
        "bigg-boss-malayalam", "season-8",
        "bigg-boss-kannada",   "season-13",
        "bigg-boss-hindi",     "season-20",
        "bigg-boss-bangla",    "season-3"
    );

    private final SentimentSourceRepository sourceRepository;
    private final SentimentIngestionRunRepository runRepository;
    private final SentimentPollRepository pollRepository;
    private final SentimentObservationRepository observationRepository;
    private final SentimentContestantAliasRepository aliasRepository;
    private final SentimentReviewItemRepository reviewItemRepository;
    private final ContestantRepository contestantRepository;
    private final SeasonRepository seasonRepository;
    private final List<SentimentSourceAdapter> adapters;

    // ── Scheduled entry point ─────────────────────────────────────────────────

    @Scheduled(cron = "0 30 */6 * * *", zone = "UTC")
    public void scheduledIngestion() {
        log.info("[SentimentIngestion] Scheduled 6-hour run starting");
        runIngestion(null, null);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public IngestionResult runIngestion(String sourceKey, String showSlug) {
        List<SentimentSource> sources = sourceKey != null
            ? sourceRepository.findBySourceKey(sourceKey).map(List::of).orElse(List.of())
            : sourceRepository.findByEnabledTrue();

        List<String> showSlugs = showSlug != null
            ? List.of(showSlug)
            : List.copyOf(SEASON_SEGMENTS.keySet());

        int totalObservations = 0;
        List<String> errors = new ArrayList<>();

        for (SentimentSource source : sources) {
            SentimentSourceAdapter adapter = findAdapter(source.getSourceKey());
            if (adapter == null) {
                log.warn("[SentimentIngestion] No adapter found for source key: {}", source.getSourceKey());
                continue;
            }

            for (String slug : showSlugs) {
                String seasonSegment = SEASON_SEGMENTS.get(slug);
                if (seasonSegment == null) continue;

                SentimentIngestionRun run = startRun(source, slug);
                try {
                    int written = ingestShow(adapter, source, slug, seasonSegment, run);
                    totalObservations += written;
                    finishRun(run, written, null, 200);
                    log.info("[SentimentIngestion] source={} show={} observations={}", source.getSourceKey(), slug, written);
                } catch (Exception e) {
                    log.error("[SentimentIngestion] source={} show={} failed: {}", source.getSourceKey(), slug, e.getMessage(), e);
                    errors.add(source.getSourceKey() + "/" + slug + ": " + e.getMessage());
                    finishRun(run, 0, e.getMessage(), -1);
                }
            }
        }

        String status = errors.isEmpty() ? "success" : (totalObservations > 0 ? "partial" : "failed");
        return new IngestionResult(status, totalObservations, errors);
    }

    // ── Per-show ingestion ────────────────────────────────────────────────────

    @Transactional
    protected int ingestShow(SentimentSourceAdapter adapter, SentimentSource source,
                              String showSlug, String seasonSegment, SentimentIngestionRun run) {

        String pollUrl = adapter.buildPollUrl(showSlug, seasonSegment);
        SentimentSourceAdapter.FetchResult result = adapter.fetchPoll(showSlug, pollUrl);

        if (!result.success()) {
            log.warn("[SentimentIngestion] Fetch failed for source={} show={}: {}", source.getSourceKey(), showSlug, result.errorMessage());
            finishRun(run, 0, result.errorMessage(), result.httpStatus());
            return 0;
        }

        // Upsert the poll snapshot
        SentimentPoll poll = pollRepository
            .findBySourceIdAndShowSlugAndPeriodLabel(source.getId(), showSlug, result.periodLabel())
            .orElseGet(() -> SentimentPoll.builder()
                .source(source)
                .showSlug(showSlug)
                .periodLabel(result.periodLabel())
                .periodWeek(result.periodWeek())
                .pollUrl(pollUrl)
                .run(run)
                .build());

        poll.setTotalVotes(result.totalVotes());
        poll.setPollUrl(pollUrl);
        poll.setRun(run);
        if (result.sourceUpdatedAt() != null) {
            try {
                poll.setSourceUpdatedAt(OffsetDateTime.parse(result.sourceUpdatedAt()));
            } catch (Exception ignored) {}
        }
        poll = pollRepository.save(poll);

        // Load DB contestants for this show to resolve identities
        List<Season> seasons = seasonRepository.findByShowSlugAndStatus(showSlug, "live");
        List<Contestant> dbContestants = seasons.isEmpty() ? List.of()
            : contestantRepository.findBySeasonIdOrderByNameAsc(seasons.get(0).getId());

        // Delete and re-insert observations for this poll (idempotent refresh)
        observationRepository.deleteAll(observationRepository.findByPollId(poll.getId()));

        int written = 0;
        for (SentimentSourceAdapter.CandidateObservation obs : result.observations()) {
            ResolvedContestant resolved = resolveContestant(obs, source, showSlug, dbContestants, result.periodLabel());

            SentimentObservation entity = SentimentObservation.builder()
                .poll(poll)
                .contestant(resolved.contestant())
                .sourceName(obs.sourceName())
                .sourceSlug(obs.sourceSlug())
                .rawCount(obs.rawCount())
                .sharePct(BigDecimal.valueOf(obs.sharePct()).setScale(3, RoundingMode.HALF_UP))
                .rankPosition(obs.rankPosition())
                .resolved(resolved.contestant() != null)
                .needsReview(resolved.needsReview())
                .build();
            observationRepository.save(entity);
            written++;
        }
        return written;
    }

    // ── Identity resolution ───────────────────────────────────────────────────

    private ResolvedContestant resolveContestant(
            SentimentSourceAdapter.CandidateObservation obs,
            SentimentSource source,
            String showSlug,
            List<Contestant> dbContestants,
            String periodLabel) {

        // 1. Check alias table first (highest confidence)
        if (obs.sourceSlug() != null) {
            Optional<SentimentContestantAlias> alias = aliasRepository.findBySourceIdAndAliasSlug(source.getId(), obs.sourceSlug());
            if (alias.isPresent()) {
                return new ResolvedContestant(alias.get().getContestant(), false);
            }
        }

        // 2. Try fuzzy name matching against DB contestants
        Contestant matched = fuzzyMatch(obs.sourceName(), obs.sourceSlug(), dbContestants);
        if (matched != null) {
            // Save as auto-alias for future runs
            saveAlias(source, matched, obs.sourceName(), obs.sourceSlug(), BigDecimal.valueOf(0.8));
            return new ResolvedContestant(matched, false);
        }

        // 3. Unresolved — add to review queue if not already there
        boolean alreadyQueued = reviewItemRepository
            .findBySourceIdAndShowSlugAndSourceSlug(source.getId(), showSlug, obs.sourceSlug())
            .isPresent();
        if (!alreadyQueued) {
            reviewItemRepository.save(SentimentReviewItem.builder()
                .source(source)
                .showSlug(showSlug)
                .sourceName(obs.sourceName())
                .sourceSlug(obs.sourceSlug())
                .periodLabel(periodLabel)
                .status("pending")
                .build());
            log.warn("[SentimentIngestion] Unresolved: source={} name='{}' slug='{}' show={}",
                source.getSourceKey(), obs.sourceName(), obs.sourceSlug(), showSlug);
        }
        return new ResolvedContestant(null, true);
    }

    private Contestant fuzzyMatch(String sourceName, String sourceSlug, List<Contestant> dbContestants) {
        String normSource = normalize(sourceName);

        Map<String, Contestant> bySlug = dbContestants.stream()
            .collect(Collectors.toMap(c -> c.getSlug().toLowerCase(), c -> c, (a, b) -> a));
        Map<String, Contestant> byNormName = dbContestants.stream()
            .collect(Collectors.toMap(c -> normalize(c.getName()), c -> c, (a, b) -> a));

        // Direct slug match
        if (sourceSlug != null) {
            Contestant c = bySlug.get(sourceSlug.toLowerCase());
            if (c != null) return c;
        }

        // Exact normalized name match
        Contestant c = byNormName.get(normSource);
        if (c != null) return c;

        // Prefix match
        for (Map.Entry<String, Contestant> e : byNormName.entrySet()) {
            String normDb = e.getKey();
            if (normSource.startsWith(normDb) || normDb.startsWith(normSource)) {
                return e.getValue();
            }
        }

        // Token match on slug
        if (sourceSlug != null) {
            for (String token : sourceSlug.split("-")) {
                if (token.length() < 4) continue;
                for (Map.Entry<String, Contestant> e : bySlug.entrySet()) {
                    if (e.getKey().contains(token)) return e.getValue();
                }
            }
        }

        return null;
    }

    private String normalize(String s) {
        return s.toLowerCase().replaceAll("[^a-z0-9 ]", "").replaceAll("\\s+", " ").trim();
    }

    @Transactional
    protected void saveAlias(SentimentSource source, Contestant contestant,
                              String aliasName, String aliasSlug, BigDecimal confidence) {
        if (aliasSlug == null) return;
        boolean exists = aliasRepository.findBySourceIdAndAliasSlug(source.getId(), aliasSlug).isPresent();
        if (!exists) {
            aliasRepository.save(SentimentContestantAlias.builder()
                .source(source)
                .contestant(contestant)
                .aliasName(aliasName)
                .aliasSlug(aliasSlug)
                .confidence(confidence)
                .addedBy("auto")
                .build());
        }
    }

    // ── Log helpers ───────────────────────────────────────────────────────────

    @Transactional
    SentimentIngestionRun startRun(SentimentSource source, String showSlug) {
        return runRepository.save(SentimentIngestionRun.builder()
            .source(source)
            .showSlug(showSlug)
            .status("running")
            .observationsWritten(0)
            .build());
    }

    @Transactional
    void finishRun(SentimentIngestionRun run, int observations, String error, int httpStatus) {
        run.setFinishedAt(OffsetDateTime.now());
        run.setObservationsWritten(observations);
        run.setStatus(error != null ? "failed" : "success");
        run.setHttpStatus(httpStatus);
        if (error != null) run.setErrorDetail(error.length() > 500 ? error.substring(0, 500) : error);
        runRepository.save(run);
    }

    // ── Adapter registry ──────────────────────────────────────────────────────

    private SentimentSourceAdapter findAdapter(String sourceKey) {
        return adapters.stream()
            .filter(a -> a.getSourceKey().equals(sourceKey))
            .findFirst()
            .orElse(null);
    }

    // ── Records ───────────────────────────────────────────────────────────────

    public record IngestionResult(String status, int totalObservations, List<String> errors) {}
    private record ResolvedContestant(Contestant contestant, boolean needsReview) {}
}
