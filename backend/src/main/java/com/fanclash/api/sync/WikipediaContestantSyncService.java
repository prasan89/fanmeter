package com.fanclash.api.sync;

import com.fanclash.api.entity.Contestant;
import com.fanclash.api.entity.ContestantSyncLog;
import com.fanclash.api.entity.Season;
import com.fanclash.api.repository.ContestantRepository;
import com.fanclash.api.repository.ContestantSyncLogRepository;
import com.fanclash.api.repository.SeasonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Daily Wikipedia sync for Bigg Boss Tamil 10 and Telugu 10 contestant rosters.
 *
 * Schedule: 6:00 AM IST (00:30 UTC).
 * Source:   MediaWiki action=parse API — returns wikitext for named sections.
 *
 * Safety rules (hard-coded):
 * - Never deletes contestants.
 * - Never changes a live status to 'active' if it was already 'eliminated'.
 * - Flags any ambiguous or missing data for manual review instead of publishing it.
 * - Never touches fan_votes or voting_rounds.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WikipediaContestantSyncService {

    private static final String MEDIAWIKI_API = "https://en.wikipedia.org/w/api.php";

    // Wikipedia page titles for each show season
    private static final Map<String, String> SHOW_WIKI_PAGES = Map.of(
        "bigg-boss-tamil",    "Bigg_Boss_(Tamil_TV_series)_season_10",
        "bigg-boss-telugu",   "Bigg_Boss_(Telugu_TV_series)_season_10",
        "bigg-boss-malayalam","Bigg_Boss_(Malayalam_TV_series)_season_8",
        "bigg-boss-kannada",  "Bigg_Boss_Kannada_season_13"
    );

    // Wikipedia source URLs for attribution
    private static final Map<String, String> SHOW_SOURCE_URLS = Map.of(
        "bigg-boss-tamil",    "https://en.wikipedia.org/wiki/Bigg_Boss_(Tamil_TV_series)_season_10",
        "bigg-boss-telugu",   "https://en.wikipedia.org/wiki/Bigg_Boss_(Telugu_TV_series)_season_10",
        "bigg-boss-malayalam","https://en.wikipedia.org/wiki/Bigg_Boss_(Malayalam_TV_series)_season_8",
        "bigg-boss-kannada",  "https://en.wikipedia.org/wiki/Bigg_Boss_Kannada_season_13"
    );

    private final ContestantRepository contestantRepository;
    private final ContestantSyncLogRepository syncLogRepository;
    private final SeasonRepository seasonRepository;
    private final RestTemplate restTemplate;

    /**
     * Runs daily at 6:00 AM IST = 00:30 UTC.
     * Cron: second minute hour day month weekday — Spring uses 6-field cron.
     */
    @Scheduled(cron = "0 30 0 * * *", zone = "UTC")
    public void scheduledSync() {
        log.info("[WikiSync] Scheduled daily sync starting");
        runSync(null);
    }

    /**
     * Triggered manually from the admin endpoint.
     * @param showSlug null = sync all, or a specific show slug
     */
    public SyncResult runSync(String showSlug) {
        List<String> slugsToSync = showSlug != null
            ? List.of(showSlug)
            : List.copyOf(SHOW_WIKI_PAGES.keySet());

        int totalUpdated = 0, totalFlagged = 0;
        List<String> errors = new ArrayList<>();

        for (String slug : slugsToSync) {
            ContestantSyncLog syncLog = startLog(slug);
            try {
                SyncShowResult result = syncShow(slug, syncLog);
                totalUpdated += result.updated();
                totalFlagged += result.flagged();
                finishLog(syncLog, result.updated(), result.flagged(), null);
                log.info("[WikiSync] {} — updated={} flagged={}", slug, result.updated(), result.flagged());
            } catch (Exception e) {
                log.error("[WikiSync] {} — sync failed: {}", slug, e.getMessage(), e);
                errors.add(slug + ": " + e.getMessage());
                finishLog(syncLog, 0, 0, e.getMessage());
            }
        }

        String status = errors.isEmpty() ? "success" : (totalUpdated > 0 ? "partial" : "failed");
        return new SyncResult(status, totalUpdated, totalFlagged, errors);
    }

    // ── Core per-show sync ───────────────────────────────────────────────────

    private SyncShowResult syncShow(String showSlug, ContestantSyncLog syncLog) {
        String wikiPage = SHOW_WIKI_PAGES.get(showSlug);
        if (wikiPage == null) throw new IllegalArgumentException("Unknown show slug: " + showSlug);

        String sourceUrl = SHOW_SOURCE_URLS.get(showSlug);

        // Fetch wikitext via MediaWiki action=parse
        String wikitext = fetchWikitext(wikiPage);
        if (wikitext == null || wikitext.isBlank()) {
            throw new RuntimeException("Empty or null wikitext returned for " + wikiPage);
        }

        // Parse contestant names and statuses from wikitext
        List<WikiContestant> wikiContestants = parseContestants(wikitext);
        if (wikiContestants.isEmpty()) {
            log.warn("[WikiSync] {} — parsed 0 contestants; skipping update to avoid data loss", showSlug);
            return new SyncShowResult(0, 0);
        }
        log.info("[WikiSync] {} — parsed {} contestants from Wikipedia", showSlug, wikiContestants.size());

        // Load live season from DB
        List<Season> seasons = seasonRepository.findByShowSlugAndStatus(showSlug, "live");
        if (seasons.isEmpty()) {
            log.warn("[WikiSync] {} — no live season found; skipping", showSlug);
            return new SyncShowResult(0, 0);
        }
        Season season = seasons.get(0);

        // Load all current DB contestants for this season
        List<Contestant> dbContestants = contestantRepository.findBySeasonIdOrderByNameAsc(season.getId());
        Map<String, Contestant> bySlug = dbContestants.stream()
            .collect(Collectors.toMap(Contestant::getSlug, c -> c));

        int updated = 0, flagged = 0;

        for (WikiContestant wc : wikiContestants) {
            String slug = toSlug(wc.name());
            Contestant db = bySlug.get(slug);

            if (db == null) {
                // Contestant found on Wikipedia but not in DB — flag for manual review
                log.warn("[WikiSync] {} — Wikipedia has '{}' (slug={}) but no DB record; skipping insert, flagging for review",
                    showSlug, wc.name(), slug);
                flagged++;
                continue;
            }

            boolean changed = reconcile(db, wc, sourceUrl);
            if (changed) {
                contestantRepository.save(db);
                updated++;
            }

            // Flag ambiguous data
            if (wc.needsReview()) {
                db.setSyncFlag("needs_review");
                db.setSyncNotes(wc.reviewReason());
                contestantRepository.save(db);
                flagged++;
            }
        }

        return new SyncShowResult(updated, flagged);
    }

    /**
     * Reconcile a DB contestant against a parsed Wikipedia record.
     * Never downgrades eliminated → active (Wikipedia may lag behind broadcast).
     * Returns true if any field was changed.
     */
    private boolean reconcile(Contestant db, WikiContestant wc, String sourceUrl) {
        boolean changed = false;

        // Update source URL and verification timestamp always
        if (!Objects.equals(db.getSourceUrl(), sourceUrl)) {
            db.setSourceUrl(sourceUrl);
            changed = true;
        }
        db.setVerifiedAt(LocalDateTime.now());

        // Status transition rules:
        // ok to change active→eliminated (Wikipedia confirmed eviction)
        // NEVER change eliminated→active (Wikipedia may not be up to date)
        // Flag anything else for review
        String dbStatus = db.getStatus();
        String wikiStatus = wc.status();

        if (wikiStatus != null && !wikiStatus.equals(dbStatus)) {
            boolean safeTransition =
                ("active".equals(dbStatus) && "eliminated".equals(wikiStatus));

            if (safeTransition) {
                db.setStatus(wikiStatus);
                db.setSyncFlag("ok");
                db.setSyncNotes("Status updated from Wikipedia: " + wikiStatus);
                changed = true;
            } else if ("eliminated".equals(dbStatus) && "active".equals(wikiStatus)) {
                // Wikipedia shows active but DB has eliminated — Wikipedia likely outdated; keep DB value
                db.setSyncFlag("needs_review");
                db.setSyncNotes("Wikipedia shows 'active' but DB has 'eliminated' — verify manually. Source: " + sourceUrl);
                changed = true;
            } else {
                // Unknown transition — flag
                db.setSyncFlag("needs_review");
                db.setSyncNotes("Wikipedia status '" + wikiStatus + "' differs from DB '" + dbStatus + "' — verify manually.");
                changed = true;
            }
        } else if (wikiStatus != null && "ok".equals(db.getSyncFlag())) {
            // Status matches; clear any previous flag
            db.setSyncFlag("ok");
            changed = true;
        }

        // Update bio only if wiki provides richer info and DB bio is blank
        if (wc.bio() != null && !wc.bio().isBlank() && (db.getBio() == null || db.getBio().isBlank())) {
            db.setBio(wc.bio());
            changed = true;
        }

        if (changed) db.setUpdatedAt(LocalDateTime.now());
        return changed;
    }

    // ── Wikipedia wikitext fetch ─────────────────────────────────────────────

    private String fetchWikitext(String pageTitle) {
        String url = MEDIAWIKI_API + "?action=query&prop=revisions&rvprop=content&rvslots=main"
            + "&format=json&titles=" + pageTitle;
        try {
            WikiApiResponse response = restTemplate.getForObject(url, WikiApiResponse.class);
            if (response == null || response.query() == null) return null;
            Map<String, Object> pages = response.query().pages();
            if (pages == null || pages.isEmpty()) return null;
            Map.Entry<String, Object> entry = pages.entrySet().iterator().next();
            @SuppressWarnings("unchecked")
            Map<String, Object> page = (Map<String, Object>) entry.getValue();
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> revisions = (List<Map<String, Object>>) page.get("revisions");
            if (revisions == null || revisions.isEmpty()) return null;
            @SuppressWarnings("unchecked")
            Map<String, Object> slots = (Map<String, Object>) revisions.get(0).get("slots");
            if (slots == null) return null;
            @SuppressWarnings("unchecked")
            Map<String, Object> mainSlot = (Map<String, Object>) slots.get("main");
            return mainSlot != null ? (String) mainSlot.get("*") : null;
        } catch (Exception e) {
            log.error("[WikiSync] Failed to fetch wikitext for {}: {}", pageTitle, e.getMessage());
            throw new RuntimeException("MediaWiki API fetch failed: " + e.getMessage(), e);
        }
    }

    // ── Wikitext parser ──────────────────────────────────────────────────────

    /**
     * Minimal wikitext parser to extract contestant names and exit status.
     * Looks for table rows containing contestant names, status keywords.
     * This is intentionally conservative — ambiguous rows are flagged.
     */
    private List<WikiContestant> parseContestants(String wikitext) {
        List<WikiContestant> contestants = new ArrayList<>();

        // Match wiki table rows (||-delimited cells) containing names
        // Pattern looks for rows with name-like cells and optional status keywords
        Pattern rowPattern = Pattern.compile(
            "\\|\\s*(?:\\[\\[([^|\\]]+)(?:\\|[^\\]]*)?\\]\\]|([A-Z][a-zA-Z .'-]+))([^\\n]*?)\\n",
            Pattern.MULTILINE
        );
        Matcher m = rowPattern.matcher(wikitext);

        Set<String> seen = new LinkedHashSet<>();
        while (m.find()) {
            String rawName = m.group(1) != null ? m.group(1).trim() : m.group(2) != null ? m.group(2).trim() : null;
            if (rawName == null || rawName.length() < 3 || rawName.length() > 60) continue;
            // Filter out obvious non-contestant cells
            if (rawName.matches(".*\\d{4}.*") || rawName.equalsIgnoreCase("name")
                || rawName.equalsIgnoreCase("contestant") || rawName.equalsIgnoreCase("status")) continue;

            String rowContext = m.group(3) != null ? m.group(3).toLowerCase() : "";

            // Determine status from row context
            String status = null;
            String bio = null;
            boolean needsReview = false;
            String reviewReason = null;

            if (rowContext.contains("evicted") || rowContext.contains("eliminated")) {
                status = "eliminated";
            } else if (rowContext.contains("walked out") || rowContext.contains("walk out")
                || rowContext.contains("withdrew") || rowContext.contains("quit")) {
                status = "eliminated";
                bio = extractEvictionNote(rowContext);
            } else if (rowContext.contains("wildcard") || rowContext.contains("wild card")
                || rowContext.contains("wild fire")) {
                status = "active";
                bio = "Wildcard entrant";
            } else if (rowContext.contains("winner")) {
                status = "winner";
            } else if (rowContext.contains("nominated")) {
                // Nominated but still active
                status = "active";
                bio = "Currently nominated";
            }

            // Flag rows where status can't be confidently determined
            if (status == null) {
                needsReview = true;
                reviewReason = "Could not determine status from Wikipedia row: " + rawName;
                status = "active"; // default — safer than flagging as eliminated
            }

            if (!seen.contains(rawName)) {
                seen.add(rawName);
                contestants.add(new WikiContestant(rawName, status, bio, needsReview, reviewReason));
            }
        }

        return contestants;
    }

    private String extractEvictionNote(String context) {
        // Try to extract a brief note from the row context
        int idx = context.indexOf("day");
        if (idx >= 0) {
            String snippet = context.substring(Math.max(0, idx - 5), Math.min(context.length(), idx + 15));
            return snippet.replaceAll("[|{}]", "").trim();
        }
        return null;
    }

    private String toSlug(String name) {
        return name.toLowerCase()
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("\\s+", "-")
            .replaceAll("-+", "-")
            .replaceAll("^-|-$", "");
    }

    // ── Log helpers ──────────────────────────────────────────────────────────

    @Transactional
    ContestantSyncLog startLog(String showSlug) {
        ContestantSyncLog log = ContestantSyncLog.builder()
            .startedAt(LocalDateTime.now())
            .status("running")
            .showSlug(showSlug)
            .updatedCount(0)
            .flaggedCount(0)
            .build();
        return syncLogRepository.save(log);
    }

    @Transactional
    void finishLog(ContestantSyncLog syncLog, int updated, int flagged, String error) {
        syncLog.setFinishedAt(LocalDateTime.now());
        syncLog.setUpdatedCount(updated);
        syncLog.setFlaggedCount(flagged);
        syncLog.setStatus(error != null ? "failed" : "success");
        if (error != null) syncLog.setErrorDetail(error.length() > 500 ? error.substring(0, 500) : error);
        syncLogRepository.save(syncLog);
    }

    // ── Records ──────────────────────────────────────────────────────────────

    public record WikiContestant(String name, String status, String bio,
                                  boolean needsReview, String reviewReason) {}

    public record SyncShowResult(int updated, int flagged) {}

    public record SyncResult(String status, int totalUpdated, int totalFlagged, List<String> errors) {}

    // MediaWiki API response shape
    public record WikiApiResponse(QueryWrapper query) {}
    public record QueryWrapper(Map<String, Object> pages) {}
}
