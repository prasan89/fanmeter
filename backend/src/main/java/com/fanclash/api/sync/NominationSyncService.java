package com.fanclash.api.sync;

import com.fanclash.api.entity.*;
import com.fanclash.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Daily nomination discovery service.
 *
 * Scrapes Wikipedia (same MediaWiki API pattern as WikipediaContestantSyncService)
 * and Google News RSS for nomination articles from regional entertainment press.
 * Results are cross-checked: ≥2 agreeing sources → auto-confirm; 1 → flag for admin.
 *
 * On Cloud Run this is triggered via Cloud Scheduler → POST /api/admin/nomination-sync/trigger.
 * The @Scheduled cron is a fallback for local dev.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NominationSyncService {

    private static final String MEDIAWIKI_API =
        "https://en.wikipedia.org/w/api.php";
    private static final String GOOGLE_NEWS_RSS =
        "https://news.google.com/rss/search?hl=en-IN&gl=IN&ceid=IN:en&q=";

    // Wikipedia page titles keyed by show slug
    private static final Map<String, String> WIKI_PAGES = Map.of(
        "bigg-boss-tamil",    "Bigg_Boss_(Tamil_TV_series)_season_10",
        "bigg-boss-telugu",   "Bigg_Boss_(Telugu_TV_series)_season_10",
        "bigg-boss-malayalam","Bigg_Boss_(Malayalam_TV_series)_season_8",
        "bigg-boss-kannada",  "Bigg_Boss_Kannada_season_13"
    );

    // Google News search terms per show (URL-encoded in method)
    private static final Map<String, String> NEWS_QUERIES = Map.of(
        "bigg-boss-tamil",    "Bigg Boss Tamil 10 nominations week eviction",
        "bigg-boss-telugu",   "Bigg Boss Telugu 10 nominations week eviction",
        "bigg-boss-malayalam","Bigg Boss Malayalam season 8 nominations week eviction",
        "bigg-boss-kannada",  "Bigg Boss Kannada 13 nominations week eviction"
    );

    private final EvictionPollRepository      pollRepository;
    private final EvictionNomineeRepository   nomineeRepository;
    private final NominationSourceRepository  sourceRepository;
    private final NominationSyncLogRepository syncLogRepository;
    private final ContestantRepository        contestantRepository;
    private final SeasonRepository            seasonRepository;
    private final RestTemplate                restTemplate;

    // ── Scheduled entry point (fallback for local dev) ────────────────────────

    @Scheduled(cron = "0 0 10 * * *", zone = "UTC")   // 3:30 PM IST daily
    public void scheduledSync() {
        log.info("[NominationSync] Scheduled daily sync starting");
        runSync(null);
    }

    // ── Public sync entry point ───────────────────────────────────────────────

    public SyncResult runSync(String showSlug) {
        List<String> slugs = showSlug != null
            ? List.of(showSlug)
            : List.copyOf(WIKI_PAGES.keySet());

        int totalNominees = 0, totalConflicts = 0;
        List<String> errors = new ArrayList<>();

        for (String slug : slugs) {
            NominationSyncLog syncLog = startLog(slug);
            try {
                ShowSyncResult r = syncShow(slug);
                totalNominees  += r.nominees();
                totalConflicts += r.conflicts();
                finishLog(syncLog, 0, r.nominees(), r.conflicts(), null);
                log.info("[NominationSync] {} — nominees={} conflicts={}", slug, r.nominees(), r.conflicts());
            } catch (Exception e) {
                log.error("[NominationSync] {} — failed: {}", slug, e.getMessage(), e);
                errors.add(slug + ": " + e.getMessage());
                finishLog(syncLog, 0, 0, 0, e.getMessage());
            }
        }

        String status = errors.isEmpty() ? "success" : (totalNominees > 0 ? "partial" : "failed");
        return new SyncResult(status, totalNominees, totalConflicts, errors);
    }

    // ── Per-show sync ────────────────────────────────────────────────────────

    private ShowSyncResult syncShow(String showSlug) {
        List<Season> seasons = seasonRepository.findByShowSlugAndStatus(showSlug, "live");
        if (seasons.isEmpty()) {
            log.warn("[NominationSync] {} — no live season; skipping", showSlug);
            return new ShowSyncResult(0, 0);
        }
        Season season = seasons.get(0);

        // Determine current week number from season start date
        int weekNumber = currentWeek(season);

        // Already have a poll for this week? Skip if nominees are already confirmed
        if (pollRepository.existsBySeasonIdAndWeekNumber(season.getId(), weekNumber)) {
            EvictionPoll existing = pollRepository
                .findBySeasonIdOrderByWeekNumberDesc(season.getId())
                .stream().filter(p -> p.getWeekNumber() == weekNumber).findFirst().orElse(null);
            if (existing != null && existing.getSourceVerified()) {
                log.info("[NominationSync] {} — week {} already verified; skipping", showSlug, weekNumber);
                return new ShowSyncResult(0, 0);
            }
        }

        // Load known contestant slugs for this season
        List<Contestant> dbContestants = contestantRepository.findBySeasonIdOrderByNameAsc(season.getId());
        Map<String, Contestant> bySlug = dbContestants.stream()
            .collect(Collectors.toMap(Contestant::getSlug, c -> c));
        Map<String, Contestant> byNameLower = dbContestants.stream()
            .collect(Collectors.toMap(c -> c.getName().toLowerCase(), c -> c, (a, b) -> a));

        // ── Source 1: Wikipedia nominations table ─────────────────────────────
        List<String> wikiNames = fetchWikipediaNominees(WIKI_PAGES.get(showSlug), weekNumber);

        // ── Source 2: Google News RSS → article scraping ──────────────────────
        List<String> newsNames = fetchNewsNominees(NEWS_QUERIES.get(showSlug), weekNumber, byNameLower);

        // ── Cross-check ───────────────────────────────────────────────────────
        Set<String> wikiSlugs = wikiNames.stream().map(this::toSlug).collect(Collectors.toSet());
        Set<String> newsSlugs = newsNames.stream().map(this::toSlug).collect(Collectors.toSet());

        Set<String> agreed    = new HashSet<>(wikiSlugs); agreed.retainAll(newsSlugs);
        Set<String> wikiOnly  = new HashSet<>(wikiSlugs); wikiOnly.removeAll(newsSlugs);
        Set<String> newsOnly  = new HashSet<>(newsSlugs); newsOnly.removeAll(wikiSlugs);

        boolean twoSourcesAgree = !agreed.isEmpty() && wikiOnly.isEmpty() && newsOnly.isEmpty();
        boolean hasConflict = !wikiOnly.isEmpty() || !newsOnly.isEmpty();
        int conflicts = hasConflict ? 1 : 0;

        // Determine nominees to record
        Set<String> allCandidateSlugs = new HashSet<>();
        allCandidateSlugs.addAll(wikiSlugs);
        allCandidateSlugs.addAll(newsSlugs);

        if (allCandidateSlugs.isEmpty()) {
            log.warn("[NominationSync] {} — week {} — 0 nominees found in any source", showSlug, weekNumber);
            return new ShowSyncResult(0, 0);
        }

        // Resolve slugs to Contestants
        List<Contestant> nominees = allCandidateSlugs.stream()
            .map(bySlug::get)
            .filter(Objects::nonNull)
            .distinct()
            .collect(Collectors.toList());

        if (nominees.isEmpty()) {
            log.warn("[NominationSync] {} — week {} — candidates found but none matched DB slugs: {}", showSlug, weekNumber, allCandidateSlugs);
            return new ShowSyncResult(0, conflicts);
        }

        // ── Upsert poll ───────────────────────────────────────────────────────
        upsertPoll(season, weekNumber, nominees, agreed, twoSourcesAgree, hasConflict,
            showSlug, wikiNames, newsNames);

        return new ShowSyncResult(nominees.size(), conflicts);
    }

    @Transactional
    protected void upsertPoll(Season season, int weekNumber, List<Contestant> nominees,
                               Set<String> agreedSlugs, boolean twoSourcesAgree, boolean hasConflict,
                               String showSlug, List<String> wikiNames, List<String> newsNames) {

        EvictionPoll poll = pollRepository
            .findBySeasonIdOrderByWeekNumberDesc(season.getId())
            .stream().filter(p -> p.getWeekNumber() == weekNumber).findFirst()
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

        // Record sources
        sourceRepository.save(NominationSource.builder()
            .poll(poll)
            .publication("Wikipedia")
            .url("https://en.wikipedia.org/wiki/" + WIKI_PAGES.get(showSlug))
            .status(wikiNames.isEmpty() ? "failed" : "confirmed")
            .rawNames(wikiNames.toString())
            .build());

        if (!newsNames.isEmpty()) {
            sourceRepository.save(NominationSource.builder()
                .poll(poll)
                .publication("Google News")
                .url(GOOGLE_NEWS_RSS + encode(NEWS_QUERIES.get(showSlug)))
                .status(newsNames.isEmpty() ? "failed" : (hasConflict ? "conflicting" : "confirmed"))
                .rawNames(newsNames.toString())
                .build());
        }

        // Set nominees (replace list if poll is still in draft)
        if ("draft".equals(poll.getStatus())) {
            nomineeRepository.deleteByPollId(poll.getId());
            for (Contestant c : nominees) {
                boolean confirmed = agreedSlugs.contains(c.getSlug()) || twoSourcesAgree;
                nomineeRepository.save(EvictionNominee.builder()
                    .poll(poll)
                    .contestant(c)
                    .confirmed(confirmed)
                    .addedBy("auto")
                    .build());
            }
            if (twoSourcesAgree && !hasConflict) {
                poll.setSourceVerified(true);
                log.info("[NominationSync] {} week {} — auto-verified ({} nominees, 2 sources agree)", showSlug, weekNumber, nominees.size());
            } else if (hasConflict) {
                poll.setAdminNotes("Sources disagree — manual review required.");
                log.warn("[NominationSync] {} week {} — CONFLICT: wiki={} news={}", showSlug, weekNumber, wikiNames, newsNames);
            } else {
                log.info("[NominationSync] {} week {} — single source only; admin review needed", showSlug, weekNumber);
            }
            poll.setUpdatedAt(LocalDateTime.now());
            pollRepository.save(poll);
        }
    }

    // ── Wikipedia fetch ───────────────────────────────────────────────────────

    private List<String> fetchWikipediaNominees(String wikiPage, int weekNumber) {
        try {
            String url = MEDIAWIKI_API + "?action=query&prop=revisions&rvprop=content&rvslots=main"
                + "&format=json&titles=" + wikiPage;
            WikipediaContestantSyncService.WikiApiResponse resp =
                restTemplate.getForObject(url, WikipediaContestantSyncService.WikiApiResponse.class);
            if (resp == null || resp.query() == null) return List.of();
            Map<String, Object> pages = resp.query().pages();
            if (pages == null || pages.isEmpty()) return List.of();
            @SuppressWarnings("unchecked")
            Map<String, Object> page = (Map<String, Object>) pages.entrySet().iterator().next().getValue();
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> revisions = (List<Map<String, Object>>) page.get("revisions");
            if (revisions == null || revisions.isEmpty()) return List.of();
            @SuppressWarnings("unchecked")
            Map<String, Object> slots = (Map<String, Object>) revisions.get(0).get("slots");
            if (slots == null) return List.of();
            @SuppressWarnings("unchecked")
            Map<String, Object> mainSlot = (Map<String, Object>) slots.get("main");
            String wikitext = mainSlot != null ? (String) mainSlot.get("*") : null;
            if (wikitext == null || wikitext.isBlank()) return List.of();
            return parseNominationsFromWikitext(wikitext, weekNumber);
        } catch (Exception e) {
            log.warn("[NominationSync] Wikipedia fetch failed for {}: {}", wikiPage, e.getMessage());
            return List.of();
        }
    }

    /**
     * Parses the Nominations section of a Bigg Boss Wikipedia article.
     * Looks for a table row matching the current week number and extracts contestant names.
     */
    private List<String> parseNominationsFromWikitext(String wikitext, int weekNumber) {
        List<String> names = new ArrayList<>();

        // Find the "Nominations" section
        int nomIdx = wikitext.toLowerCase().indexOf("== nominations ==");
        if (nomIdx < 0) nomIdx = wikitext.toLowerCase().indexOf("===nominations===");
        if (nomIdx < 0) nomIdx = wikitext.toLowerCase().indexOf("nomination");
        if (nomIdx < 0) return names;

        // Look for rows mentioning the current week
        String nominationSection = wikitext.substring(nomIdx, Math.min(nomIdx + 8000, wikitext.length()));
        String weekPattern = "week " + weekNumber + "|week\\s*" + weekNumber + "\\b|week-" + weekNumber;
        Pattern weekPat = Pattern.compile(weekPattern, Pattern.CASE_INSENSITIVE);

        // After finding week, extract wiki-linked names from the surrounding 500 chars
        Matcher wm = weekPat.matcher(nominationSection);
        if (!wm.find()) return names;

        String context = nominationSection.substring(wm.start(), Math.min(wm.start() + 600, nominationSection.length()));
        Pattern linkPat = Pattern.compile("\\[\\[([^|\\]]+?)(?:\\|[^\\]]*)?\\]\\]");
        Matcher lm = linkPat.matcher(context);
        while (lm.find()) {
            String name = lm.group(1).trim();
            if (name.length() >= 3 && name.length() <= 60
                && !name.contains(":")
                && !name.matches(".*\\d{4}.*")) {
                names.add(name);
            }
        }
        return names;
    }

    // ── Google News + article scraping ────────────────────────────────────────

    private List<String> fetchNewsNominees(String query, int weekNumber,
                                           Map<String, Contestant> byNameLower) {
        try {
            String rssUrl = GOOGLE_NEWS_RSS + encode(query + " week " + weekNumber);
            String rssXml = restTemplate.getForObject(rssUrl, String.class);
            if (rssXml == null || rssXml.isBlank()) return List.of();

            // Extract up to 3 article links from RSS
            List<String> articleUrls = extractArticleUrls(rssXml, 3);
            if (articleUrls.isEmpty()) return List.of();

            Set<String> found = new LinkedHashSet<>();
            for (String articleUrl : articleUrls) {
                List<String> fromArticle = scrapeNomineesFromArticle(articleUrl, byNameLower);
                found.addAll(fromArticle);
            }
            return List.copyOf(found);
        } catch (Exception e) {
            log.warn("[NominationSync] News fetch failed for query '{}': {}", query, e.getMessage());
            return List.of();
        }
    }

    private List<String> extractArticleUrls(String rssXml, int max) {
        List<String> urls = new ArrayList<>();
        Pattern linkPat = Pattern.compile("<link>(?!<)(https?://[^<]+)</link>", Pattern.CASE_INSENSITIVE);
        Matcher m = linkPat.matcher(rssXml);
        while (m.find() && urls.size() < max) {
            String url = m.group(1).trim();
            // Skip Google News redirect links; accept direct news site URLs
            if (!url.contains("news.google.com")) urls.add(url);
        }
        return urls;
    }

    private List<String> scrapeNomineesFromArticle(String articleUrl, Map<String, Contestant> byNameLower) {
        try {
            Document doc = Jsoup.connect(articleUrl)
                .userAgent("Mozilla/5.0 (compatible; FanMeterBot/1.0)")
                .timeout(8000)
                .get();

            String bodyText = doc.body().text().toLowerCase();
            List<String> matched = new ArrayList<>();

            // Check each known contestant name against article text
            for (Map.Entry<String, Contestant> entry : byNameLower.entrySet()) {
                String nameLower = entry.getKey();
                Contestant c = entry.getValue();
                // Only look for active contestants as nominees
                if (!"active".equals(c.getStatus())) continue;
                if (bodyText.contains(nameLower) &&
                    (bodyText.contains("nominat") || bodyText.contains("evict") || bodyText.contains("safe"))) {
                    matched.add(c.getName());
                }
            }
            return matched;
        } catch (Exception e) {
            log.debug("[NominationSync] Article scrape failed for {}: {}", articleUrl, e.getMessage());
            return List.of();
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private int currentWeek(Season season) {
        if (season.getStartDate() == null) return 1;
        long days = ChronoUnit.DAYS.between(season.getStartDate(), LocalDate.now());
        return Math.max(1, (int) (days / 7) + 1);
    }

    private String toSlug(String name) {
        return name.toLowerCase()
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("\\s+", "-")
            .replaceAll("-+", "-")
            .replaceAll("^-|-$", "");
    }

    private String encode(String s) {
        try { return java.net.URLEncoder.encode(s, "UTF-8"); }
        catch (Exception e) { return s.replace(" ", "+"); }
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

    // ── Records ───────────────────────────────────────────────────────────────

    public record ShowSyncResult(int nominees, int conflicts) {}
    public record SyncResult(String status, int totalNominees, int totalConflicts, List<String> errors) {}
    public record SyncLogEntry(Long id, String showSlug, LocalDateTime startedAt, LocalDateTime finishedAt,
                                String status, int nomineesFound, int conflictsFound) {}
    public record SyncStatusDto(List<SyncLogEntry> logs) {}
}
