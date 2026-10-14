package com.fanclash.api.sentiment.adapter;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Fetches fan poll data from HousePulse nominations pages.
 *
 * HousePulse tracks nominations and outcomes, but the public nominations page
 * does not expose live vote percentages per nominee. Instead, this adapter
 * derives an "equal share" model from the current nominees list, which can be
 * combined with FanMeter's own heart-vote signals in SentimentCalculationService.
 *
 * When HousePulse adds vote percentage data to their pages, update parseVotePercentages().
 *
 * robots.txt: Compliant — HousePulse allows crawlers on /shows/* paths.
 */
@Slf4j
@Component
public class HousePulseSentimentAdapter implements SentimentSourceAdapter {

    private static final String SOURCE_KEY = "housepulse";
    private static final String URL_TEMPLATE = "https://housepulse.in/shows/{slug}/{season}/nominations";
    private static final Pattern WEEK_NUMBER_PAT = Pattern.compile("Week\\s+(\\d+)", Pattern.CASE_INSENSITIVE);

    @Override
    public String getSourceKey() {
        return SOURCE_KEY;
    }

    @Override
    public String buildPollUrl(String showSlug, String seasonSegment) {
        return URL_TEMPLATE
            .replace("{slug}", showSlug)
            .replace("{season}", seasonSegment);
    }

    @Override
    public FetchResult fetchPoll(String showSlug, String pollUrl) {
        Document doc;
        int httpStatus = -1;
        try {
            doc = Jsoup.connect(pollUrl)
                .userAgent("Mozilla/5.0 (compatible; FanMeterBot/1.0; +https://fanmeter.in)")
                .timeout(15_000)
                .get();
            httpStatus = 200;
        } catch (org.jsoup.HttpStatusException e) {
            httpStatus = e.getStatusCode();
            log.warn("[HP-Sentiment] HTTP {} for {}: {}", e.getStatusCode(), pollUrl, e.getMessage());
            return FetchResult.failure("HTTP " + e.getStatusCode(), httpStatus);
        } catch (Exception e) {
            log.warn("[HP-Sentiment] Fetch failed for {}: {}", pollUrl, e.getMessage());
            return FetchResult.failure(e.getMessage(), httpStatus);
        }
        return parseDocument(showSlug, pollUrl, doc, httpStatus);
    }

    protected FetchResult parseDocument(String showSlug, String pollUrl, Document doc, int httpStatus) {
        Element currentSection = doc.selectFirst("section[aria-labelledby='current-nominations-heading']");
        if (currentSection == null) {
            return FetchResult.failure("current-nominations section not found", httpStatus);
        }

        int weekNumber = parseWeekNumber(currentSection);
        if (weekNumber <= 0) {
            return FetchResult.failure("week number not found", httpStatus);
        }

        String periodLabel = "Week " + weekNumber;
        List<NomineeEntry> nominees = parseNominees(currentSection);
        if (nominees.isEmpty()) {
            return FetchResult.failure("no nominees found in current section", httpStatus);
        }

        // Try to parse explicit vote percentages (for future HousePulse feature support)
        List<CandidateObservation> observations = parseVotePercentages(currentSection, nominees, weekNumber);

        String updatedAt = parseUpdatedAt(doc);
        long totalVotes = observations.stream().mapToLong(CandidateObservation::rawCount).sum();

        log.info("[HP-Sentiment] {} {} — {} nominees, {} total signal units", showSlug, periodLabel, observations.size(), totalVotes);
        return new FetchResult(true, periodLabel, weekNumber, totalVotes > 0 ? totalVotes : null,
            updatedAt, observations, null, httpStatus);
    }

    /**
     * Parse explicit vote percentages from the page.
     * HousePulse does not currently publish per-nominee vote counts.
     * If a data-percent attribute or vote bar is present, use it.
     * Otherwise fall back to equal-share signal (1 unit per nominee).
     */
    private List<CandidateObservation> parseVotePercentages(
            Element currentSection, List<NomineeEntry> nominees, int weekNumber) {

        List<CandidateObservation> out = new ArrayList<>();
        int rank = 1;

        for (NomineeEntry n : nominees) {
            Element article = n.element();
            double pct = 0;
            long rawCount = 0;

            // Check for explicit percentage data (e.g. data-percent="12.5" or aria-valuenow)
            String dataPct = article.attr("data-percent");
            if (!dataPct.isBlank()) {
                try { pct = Double.parseDouble(dataPct); } catch (NumberFormatException ignored) {}
            }
            if (pct == 0) {
                Element bar = article.selectFirst("[aria-valuenow]");
                if (bar != null) {
                    try { pct = Double.parseDouble(bar.attr("aria-valuenow")); } catch (NumberFormatException ignored) {}
                }
            }

            // If no explicit data, use equal-share (1 unit each) — all nominees get equal weight
            if (pct == 0 && rawCount == 0) {
                rawCount = 1L;
            } else {
                rawCount = Math.round(pct * 100); // scale pct to integer units
            }

            out.add(new CandidateObservation(n.name(), n.slug(), rawCount, pct, rank++));
        }

        return out;
    }

    private List<NomineeEntry> parseNominees(Element currentSection) {
        List<NomineeEntry> nominees = new ArrayList<>();
        Elements articles = currentSection.select("article");
        for (Element article : articles) {
            Element link = article.selectFirst("a[href^='/people/']");
            if (link == null) continue;
            String name = link.text().trim();
            String slug = extractSlug(link.attr("href"));
            if (name.isBlank() || slug.isBlank()) continue;
            nominees.add(new NomineeEntry(name, slug, article));
        }
        return nominees;
    }

    private int parseWeekNumber(Element section) {
        Element h2 = section.selectFirst("h2");
        if (h2 == null) return -1;
        Matcher m = WEEK_NUMBER_PAT.matcher(h2.text());
        return m.find() ? Integer.parseInt(m.group(1)) : -1;
    }

    private String extractSlug(String href) {
        if (href == null || !href.startsWith("/people/")) return "";
        return href.substring("/people/".length()).trim();
    }

    private String parseUpdatedAt(Document doc) {
        try {
            Element time = doc.selectFirst("time[dateTime]");
            return time != null ? time.attr("dateTime") : null;
        } catch (Exception e) {
            return null;
        }
    }

    private record NomineeEntry(String name, String slug, Element element) {}
}
