package com.fanclash.api.sync;

import com.fanclash.api.entity.*;
import com.fanclash.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Nomination discovery service.
 *
 * Fetches the HousePulse nominations page for each live Bigg Boss season,
 * parses the current-week nominee list, and upserts an eviction poll record.
 *
 * Poll states (stored in eviction_polls.nomination_state):
 *   NOMINATIONS_PUBLISHED   — nominees extracted, verified, poll is live
 *   NEEDS_VERIFICATION      — extracted but could not match enough DB contestants
 *   SOURCE_UNAVAILABLE      — HTTP/parse failure, last-good snapshot retained
 *   NO_NOMINATIONS_CONFIRMED — source indicates no nominations this week
 *
 * On Cloud Run: POST /api/admin/nomination-sync/trigger (via Cloud Scheduler).
 * Fallback @Scheduled cron is used in local dev.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NominationSyncService {

    /** HousePulse URL template: {slug} = bigg-boss-{language}, {season} = season-N */
    private static final String HP_URL_TEMPLATE =
        "https://housepulse.in/shows/{slug}/{season}/nominations";

    /** Approved source registry. Each entry: show-slug → nominations URL */
    static final Map<String, ShowConfig> SHOW_CONFIGS = Map.of(
        "bigg-boss-tamil",    new ShowConfig("bigg-boss-tamil",    "season-10", "Bigg Boss Tamil 10"),
        "bigg-boss-telugu",   new ShowConfig("bigg-boss-telugu",   "season-10", "Bigg Boss Telugu 10"),
        "bigg-boss-malayalam",new ShowConfig("bigg-boss-malayalam","season-8",  "Bigg Boss Malayalam 8"),
        "bigg-boss-kannada",  new ShowConfig("bigg-boss-kannada",  "season-13", "Bigg Boss Kannada 13")
    );

    /** Minimum fraction of nominees that must match known DB contestants to auto-publish */
    private static final double MATCH_THRESHOLD = 0.5;

    private final EvictionPollRepository      pollRepository;
    private final EvictionNomineeRepository   nomineeRepository;
    private final NominationSourceRepository  sourceRepository;
    private final NominationSyncLogRepository syncLogRepository;
    private final ContestantRepository        contestantRepository;
    private final SeasonRepository            seasonRepository;
    private final HousePulseCrawler           crawler;

    // ── Scheduled entry point (fallback for local dev) ────────────────────────

    @Scheduled(cron = "0 0 */6 * * *", zone = "UTC")  // every 6 hours
    public void scheduledSync() {
        log.info("[NominationSync] Scheduled 6-hour sync starting");
        runSync(null);
    }

    // ── Public sync entry point ───────────────────────────────────────────────

    public SyncResult runSync(String showSlug) {
        List<String> slugs = showSlug != null
            ? List.of(showSlug)
            : List.copyOf(SHOW_CONFIGS.keySet());

        int totalNominees = 0, totalConflicts = 0;
        List<String> errors = new ArrayList<>();

        for (String slug : slugs) {
            NominationSyncLog syncLog = startLog(slug);
            try {
                ShowSyncResult r = syncShow(slug);
                totalNominees  += r.nominees();
                totalConflicts += r.conflicts();
                finishLog(syncLog, 1, r.nominees(), r.conflicts(), null);
                log.info("[NominationSync] {} — nominees={} conflicts={} state={}",
                    slug, r.nominees(), r.conflicts(), r.state());
            } catch (Exception e) {
                log.error("[NominationSync] {} — failed: {}", slug, e.getMessage(), e);
                errors.add(slug + ": " + e.getMessage());
                finishLog(syncLog, 0, 0, 0, e.getMessage());
            }
        }

        String status = errors.isEmpty() ? "success" : (totalNominees > 0 ? "partial" : "failed");
        return new SyncResult(status, totalNominees, totalConflicts, errors);
    }

    // ── Dry-run mode (no DB writes) ───────────────────────────────────────────

    public DryRunResult dryRun(String showSlug) {
        ShowConfig cfg = SHOW_CONFIGS.get(showSlug);
        if (cfg == null) return new DryRunResult(showSlug, false, -1, List.of(), "unknown show slug");

        String url = nominationsUrl(cfg);
        HousePulseCrawler.CrawlResult crawl = crawler.fetchNominations(url);
        if (!crawl.success()) return new DryRunResult(showSlug, false, -1, List.of(), crawl.errorMessage());

        List<Season> seasons = seasonRepository.findByShowSlugAndStatus(showSlug, "live");
        if (seasons.isEmpty()) return new DryRunResult(showSlug, false, crawl.weekNumber(), List.of(), "no live season");

        Season season = seasons.get(0);
        List<Contestant> dbContestants = contestantRepository.findBySeasonIdOrderByNameAsc(season.getId());
        List<ContestantMatch> matches = matchNominees(crawl.nominees(), dbContestants);

        return new DryRunResult(showSlug, true, crawl.weekNumber(), matches, null);
    }

    // ── Per-show sync ────────────────────────────────────────────────────────

    private ShowSyncResult syncShow(String showSlug) {
        ShowConfig cfg = SHOW_CONFIGS.get(showSlug);
        if (cfg == null) {
            log.warn("[NominationSync] {} — no config; skipping", showSlug);
            return new ShowSyncResult(0, 0, "SKIPPED");
        }

        // ── Find live season ──────────────────────────────────────────────────
        List<Season> seasons = seasonRepository.findByShowSlugAndStatus(showSlug, "live");
        if (seasons.isEmpty()) {
            log.info("[NominationSync] {} — no live season; skipping", showSlug);
            return new ShowSyncResult(0, 0, "NO_LIVE_SEASON");
        }
        Season season = seasons.get(0);

        // ── Crawl HousePulse ──────────────────────────────────────────────────
        String url = nominationsUrl(cfg);
        HousePulseCrawler.CrawlResult crawl = crawler.fetchNominations(url);

        if (!crawl.success()) {
            // Source unavailable — update existing poll state, don't wipe nominees
            markSourceUnavailable(season, url, crawl.errorMessage());
            return new ShowSyncResult(0, 0, "SOURCE_UNAVAILABLE");
        }

        int weekNumber = crawl.weekNumber();

        // ── Skip if already verified at this week ─────────────────────────────
        Optional<EvictionPoll> existing = pollRepository
            .findBySeasonIdOrderByWeekNumberDesc(season.getId())
            .stream()
            .filter(p -> p.getWeekNumber() == weekNumber)
            .findFirst();

        if (existing.isPresent() && existing.get().getSourceVerified()
                && "open".equals(existing.get().getStatus())) {
            log.info("[NominationSync] {} — week {} already verified+open; skipping", showSlug, weekNumber);
            return new ShowSyncResult(existing.get().getEvictionNominees().size(), 0, "ALREADY_VERIFIED");
        }

        // ── Match nominees to DB contestants ──────────────────────────────────
        List<Contestant> dbContestants = contestantRepository.findBySeasonIdOrderByNameAsc(season.getId());
        List<ContestantMatch> matches = matchNominees(crawl.nominees(), dbContestants);

        List<Contestant> matched   = matches.stream().filter(m -> m.contestant() != null).map(ContestantMatch::contestant).distinct().collect(Collectors.toList());
        List<String>     unmatched = matches.stream().filter(m -> m.contestant() == null).map(ContestantMatch::sourceName).collect(Collectors.toList());

        double matchRate = crawl.nominees().isEmpty() ? 0
            : (double) matched.size() / crawl.nominees().size();

        String nominationState;
        boolean verified = false;

        if (matched.isEmpty()) {
            nominationState = "NEEDS_VERIFICATION";
            log.warn("[NominationSync] {} week {} — 0 matches from {} nominees; needs admin review. Unmatched: {}",
                showSlug, weekNumber, crawl.nominees().size(), crawl.nominees().stream().map(HousePulseCrawler.Nominee::name).collect(Collectors.toList()));
        } else if (matchRate < MATCH_THRESHOLD) {
            nominationState = "NEEDS_VERIFICATION";
            log.warn("[NominationSync] {} week {} — low match rate {}/{} ({}%). Unmatched: {}",
                showSlug, weekNumber, matched.size(), crawl.nominees().size(),
                (int)(matchRate * 100), unmatched);
        } else {
            nominationState = "NOMINATIONS_PUBLISHED";
            verified = true;
            if (!unmatched.isEmpty()) {
                log.warn("[NominationSync] {} week {} — {} nominees unmatched: {}",
                    showSlug, weekNumber, unmatched.size(), unmatched);
            }
        }

        // ── Upsert poll and nominees ──────────────────────────────────────────
        upsertPoll(season, weekNumber, matched, nominationState, verified,
            url, crawl, showSlug, unmatched, dbContestants);

        return new ShowSyncResult(matched.size(), unmatched.size(), nominationState);
    }

    // ── Contestant name matching ──────────────────────────────────────────────

    /**
     * Attempts to match each scraped nominee to a DB contestant.
     * Strategy (in order of preference):
     * 1. HousePulse slug directly matches DB slug
     * 2. Normalized name exact match
     * 3. Normalized name prefix match (handles "Akshitha Ashok" vs "Akshitha")
     * 4. Any single token in the name matches a unique DB slug token
     */
    List<ContestantMatch> matchNominees(List<HousePulseCrawler.Nominee> nominees,
                                        List<Contestant> dbContestants) {
        Map<String, Contestant> bySlug = dbContestants.stream()
            .collect(Collectors.toMap(c -> c.getSlug().toLowerCase(), c -> c, (a, b) -> a));
        Map<String, Contestant> byNormName = dbContestants.stream()
            .collect(Collectors.toMap(c -> normalize(c.getName()), c -> c, (a, b) -> a));

        List<ContestantMatch> results = new ArrayList<>();
        for (HousePulseCrawler.Nominee n : nominees) {
            Contestant match = resolveContestant(n, bySlug, byNormName);
            results.add(new ContestantMatch(n.name(), n.housePulseSlug(), n.profileImageUrl(), match));
        }
        return results;
    }

    private Contestant resolveContestant(HousePulseCrawler.Nominee n,
                                          Map<String, Contestant> bySlug,
                                          Map<String, Contestant> byNormName) {
        // 1. Direct slug match (most reliable)
        Contestant c = bySlug.get(n.housePulseSlug().toLowerCase());
        if (c != null) return c;

        // 2. Normalized full name
        c = byNormName.get(normalize(n.name()));
        if (c != null) return c;

        // 3. Prefix: "Akshitha Ashok" from source vs "Akshitha" in DB, or vice versa
        String normSource = normalize(n.name());
        for (Map.Entry<String, Contestant> e : byNormName.entrySet()) {
            String normDb = e.getKey();
            if (normSource.startsWith(normDb) || normDb.startsWith(normSource)) {
                return e.getValue();
            }
        }

        // 4. Token match — any non-trivial word in source slug matches a unique DB slug segment
        String[] sourceTokens = n.housePulseSlug().split("-");
        for (String token : sourceTokens) {
            if (token.length() < 4) continue;
            for (Map.Entry<String, Contestant> e : bySlug.entrySet()) {
                if (e.getKey().contains(token)) {
                    return e.getValue();
                }
            }
        }

        return null;
    }

    private String normalize(String s) {
        return s.toLowerCase()
            .replaceAll("[^a-z0-9 ]", "")
            .replaceAll("\\s+", " ")
            .trim();
    }

    // ── DB operations ─────────────────────────────────────────────────────────

    @Transactional
    protected void upsertPoll(Season season, int weekNumber, List<Contestant> nominees,
                               String nominationState, boolean verified,
                               String sourceUrl, HousePulseCrawler.CrawlResult crawl,
                               String showSlug, List<String> unmatched,
                               List<Contestant> dbContestants) {

        EvictionPoll poll = pollRepository
            .findBySeasonIdOrderByWeekNumberDesc(season.getId())
            .stream()
            .filter(p -> p.getWeekNumber() == weekNumber)
            .findFirst()
            .orElseGet(() -> {
                EvictionPoll p = EvictionPoll.builder()
                    .season(season)
                    .weekNumber(weekNumber)
                    .weekLabel("Week " + weekNumber)
                    .voteMode("save")
                    .status("draft")
                    .sourceVerified(false)
                    .build();
                return pollRepository.save(p);
            });

        // Only update nominees if the poll is still in draft (not manually opened/managed)
        if ("draft".equals(poll.getStatus()) || "open".equals(poll.getStatus())) {
            nomineeRepository.deleteByPollId(poll.getId());
            for (Contestant c : nominees) {
                nomineeRepository.save(EvictionNominee.builder()
                    .poll(poll)
                    .contestant(c)
                    .confirmed(verified)
                    .addedBy("auto")
                    .build());
            }

            // Auto-open when verified
            if (verified && "draft".equals(poll.getStatus())) {
                poll.setStatus("open");
            }

            poll.setSourceVerified(verified);
            poll.setNominationState(nominationState);

            if (!unmatched.isEmpty()) {
                poll.setAdminNotes("Unmatched from source: " + unmatched);
            }

            poll.setUpdatedAt(LocalDateTime.now());
            pollRepository.save(poll);
        }

        // Always record the source run
        List<String> nomineeNames = crawl.nominees().stream()
            .map(HousePulseCrawler.Nominee::name)
            .collect(Collectors.toList());

        sourceRepository.save(NominationSource.builder()
            .poll(poll)
            .publication("HousePulse")
            .url(sourceUrl)
            .status(verified ? "confirmed" : (nominees.isEmpty() ? "failed" : "conflicting"))
            .rawNames(nomineeNames.toString())
            .notes(crawl.sourceUpdatedAt() != null
                ? "Source updated: " + crawl.sourceUpdatedAt()
                : null)
            .build());
    }

    @Transactional
    protected void markSourceUnavailable(Season season, String sourceUrl, String error) {
        // Find any current open/draft poll and update its state
        pollRepository.findTopBySeasonIdAndStatusOrderByWeekNumberDesc(season.getId(), "open").ifPresent(p -> {
            p.setNominationState("SOURCE_UNAVAILABLE");
            p.setUpdatedAt(LocalDateTime.now());
            pollRepository.save(p);
        });
        pollRepository.findBySeasonIdOrderByWeekNumberDesc(season.getId())
            .stream().filter(p -> "draft".equals(p.getStatus())).findFirst().ifPresent(p -> {
                p.setNominationState("SOURCE_UNAVAILABLE");
                p.setUpdatedAt(LocalDateTime.now());
                pollRepository.save(p);
            });
    }

    // ── Log helpers ───────────────────────────────────────────────────────────

    @Transactional
    NominationSyncLog startLog(String showSlug) {
        NominationSyncLog log = NominationSyncLog.builder()
            .showSlug(showSlug)
            .status("running")
            .sourcesChecked(0)
            .nomineesFound(0)
            .conflictsFound(0)
            .build();
        return syncLogRepository.save(log);
    }

    @Transactional
    void finishLog(NominationSyncLog log, int sources, int nominees, int conflicts, String error) {
        log.setFinishedAt(LocalDateTime.now());
        log.setSourcesChecked(sources);
        log.setNomineesFound(nominees);
        log.setConflictsFound(conflicts);
        log.setStatus(error != null ? "failed" : "success");
        if (error != null) log.setErrorDetail(error.length() > 500 ? error.substring(0, 500) : error);
        syncLogRepository.save(log);
    }

    public SyncStatusDto getStatus() {
        return new SyncStatusDto(syncLogRepository.findTop20ByOrderByStartedAtDesc().stream()
            .map(l -> new SyncLogEntry(l.getId(), l.getShowSlug(), l.getStartedAt(),
                l.getFinishedAt(), l.getStatus(), l.getNomineesFound(), l.getConflictsFound()))
            .collect(Collectors.toList()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String nominationsUrl(ShowConfig cfg) {
        return HP_URL_TEMPLATE
            .replace("{slug}",   cfg.housePulseSlug())
            .replace("{season}", cfg.seasonSegment());
    }

    // ── Records ───────────────────────────────────────────────────────────────

    public record ShowConfig(String housePulseSlug, String seasonSegment, String displayName) {}

    public record ShowSyncResult(int nominees, int conflicts, String state) {}

    public record ContestantMatch(String sourceName, String sourceSlug,
                                   String profileImageUrl, Contestant contestant) {}

    public record DryRunResult(String showSlug, boolean success, int weekNumber,
                                List<ContestantMatch> matches, String error) {}

    public record SyncResult(String status, int totalNominees, int totalConflicts, List<String> errors) {}

    public record SyncLogEntry(Long id, String showSlug, LocalDateTime startedAt, LocalDateTime finishedAt,
                                String status, int nomineesFound, int conflictsFound) {}

    public record SyncStatusDto(List<SyncLogEntry> logs) {}
}
