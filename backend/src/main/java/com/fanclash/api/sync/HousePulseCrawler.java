package com.fanclash.api.sync;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses the HousePulse nominations page for a Bigg Boss season.
 *
 * Page structure (as observed from live pages):
 *   <section aria-labelledby="current-nominations-heading">
 *     <h2 id="current-nominations-heading">Week N nominations</h2>
 *     <article>
 *       <img alt="Name" src="https://media.housepulse.in/...">
 *       <a href="/people/slug">Name</a>
 *     </article>
 *     ...
 *   </section>
 *   <section aria-labelledby="nomination-history-heading">
 *     <!-- historical table — intentionally not parsed -->
 *   </section>
 *
 * URL pattern: https://housepulse.in/shows/bigg-boss-{language}/season-{n}/nominations
 */
@Slf4j
@Component
public class HousePulseCrawler {

    static final String BASE_URL = "https://housepulse.in";
    private static final Pattern WEEK_NUMBER_PAT = Pattern.compile("Week\\s+(\\d+)", Pattern.CASE_INSENSITIVE);

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Fetches and parses the nominations page, returning only the current-week nominees.
     * History table is intentionally ignored.
     */
    public CrawlResult fetchNominations(String nominationsUrl) {
        Document doc;
        try {
            doc = Jsoup.connect(nominationsUrl)
                .userAgent("Mozilla/5.0 (compatible; FanMeterBot/1.0; +https://fanmeter.in)")
                .timeout(15_000)
                .get();
        } catch (Exception e) {
            log.warn("[HousePulse] HTTP fetch failed for {}: {}", nominationsUrl, e.getMessage());
            return CrawlResult.failed(nominationsUrl, e.getMessage());
        }
        return parseDocument(nominationsUrl, doc);
    }

    /**
     * Parses a pre-loaded Jsoup Document. Separated from HTTP fetch for testability.
     */
    CrawlResult parseDocument(String sourceUrl, Document doc) {
        // Current-week section only — never mix with history
        Element currentSection = doc.selectFirst("section[aria-labelledby='current-nominations-heading']");
        if (currentSection == null) {
            log.warn("[HousePulse] No current-nominations-heading section at {}", sourceUrl);
            return CrawlResult.failed(sourceUrl, "current-nominations section not found");
        }

        // Week number from h2 inside the current section
        int weekNumber = parseWeekNumber(currentSection);
        if (weekNumber <= 0) {
            log.warn("[HousePulse] Could not parse week number at {}", sourceUrl);
            return CrawlResult.failed(sourceUrl, "week number not found in current-nominations section");
        }

        // Nominees from article elements within the current section only
        List<Nominee> nominees = new ArrayList<>();
        Elements articles = currentSection.select("article");
        for (Element article : articles) {
            Element link = article.selectFirst("a[href^='/people/']");
            Element img  = article.selectFirst("img");
            if (link == null) continue;

            String name     = link.text().trim();
            String slug     = extractPeopleSlug(link.attr("href"));
            String imageUrl = img != null ? resolveMediaUrl(img.attr("src")) : null;

            if (name.isBlank() || slug.isBlank()) continue;
            nominees.add(new Nominee(name, slug, imageUrl));
        }

        if (nominees.isEmpty()) {
            log.warn("[HousePulse] Zero nominees extracted from current section at {}", sourceUrl);
            return CrawlResult.failed(sourceUrl, "no nominees in current-nominations section");
        }

        // Best-effort: parse most recent <time dateTime="..."> from the page intro
        LocalDateTime updatedAt = parseUpdatedAt(doc);

        log.info("[HousePulse] {} — week {} — {} nominees", sourceUrl, weekNumber, nominees.size());
        return CrawlResult.success(sourceUrl, weekNumber, nominees, updatedAt);
    }

    // ── Parsing helpers ───────────────────────────────────────────────────────

    private int parseWeekNumber(Element section) {
        Element h2 = section.selectFirst("h2");
        if (h2 == null) return -1;
        Matcher m = WEEK_NUMBER_PAT.matcher(h2.text());
        return m.find() ? Integer.parseInt(m.group(1)) : -1;
    }

    private String extractPeopleSlug(String href) {
        if (href == null || !href.startsWith("/people/")) return "";
        return href.substring("/people/".length()).trim();
    }

    private String resolveMediaUrl(String src) {
        if (src == null || src.isBlank()) return null;
        return src.startsWith("http") ? src : BASE_URL + src;
    }

    private LocalDateTime parseUpdatedAt(Document doc) {
        try {
            Element time = doc.selectFirst("p time[dateTime]");
            if (time == null) time = doc.selectFirst("section time[dateTime]");
            if (time == null) time = doc.selectFirst("time[dateTime]");
            if (time == null) return null;
            return OffsetDateTime.parse(time.attr("dateTime")).toLocalDateTime();
        } catch (Exception e) {
            return null;
        }
    }

    // ── Result types ─────────────────────────────────────────────────────────

    public record Nominee(String name, String housePulseSlug, String profileImageUrl) {}

    public record CrawlResult(
        String sourceUrl,
        boolean success,
        int weekNumber,
        List<Nominee> nominees,
        LocalDateTime sourceUpdatedAt,
        String errorMessage
    ) {
        static CrawlResult success(String url, int week, List<Nominee> nominees, LocalDateTime updatedAt) {
            return new CrawlResult(url, true, week, nominees, updatedAt, null);
        }

        static CrawlResult failed(String url, String error) {
            return new CrawlResult(url, false, -1, List.of(), null, error);
        }
    }
}
