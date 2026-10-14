package com.fanclash.api.sentiment.adapter;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Fetches fan poll vote counts from TamilGlitz via their embedded Polldaddy/Crowdsignal polls.
 *
 * Each show has a dedicated Polldaddy poll. Results are fetched from the Crowdsignal
 * vote-js.php endpoint which returns an HTML fragment with live vote counts per contestant.
 *
 * Endpoint: https://polls.polldaddy.com/vote-js.php?p={pollId}
 * Response: JavaScript that sets innerHTML to HTML with pds-feedback-group <li> elements.
 *
 * robots.txt: Polldaddy/Crowdsignal is a third-party widget API — no robots.txt restriction.
 */
@Slf4j
@Component
public class TamilGlitzSentimentAdapter implements SentimentSourceAdapter {

    private static final String SOURCE_KEY = "tamilglitz";
    private static final String RESULTS_URL = "https://polls.polldaddy.com/vote-js.php?p={pollId}";

    /** Polldaddy poll IDs per show slug. Add more shows as TamilGlitz creates polls. */
    private static final Map<String, String> POLL_IDS = Map.of(
        "bigg-boss-tamil",   "11073604",
        "bigg-boss-telugu",  "10967724"
    );

    private static final Pattern VOTES_PAT  = Pattern.compile("([\\d,]+)\\s*votes", Pattern.CASE_INSENSITIVE);
    private static final Pattern WEEK_PAT   = Pattern.compile("Week\\s+(\\d+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern TOTAL_PAT  = Pattern.compile("[\\d,]+");

    @Override
    public String getSourceKey() {
        return SOURCE_KEY;
    }

    @Override
    public String buildPollUrl(String showSlug, String seasonSegment) {
        String pollId = POLL_IDS.get(showSlug);
        if (pollId == null) {
            return null;
        }
        return RESULTS_URL.replace("{pollId}", pollId);
    }

    @Override
    public FetchResult fetchPoll(String showSlug, String pollUrl) {
        if (pollUrl == null) {
            String pollId = POLL_IDS.get(showSlug);
            if (pollId == null) {
                log.info("[TamilGlitz] No poll configured for show: {}", showSlug);
                return FetchResult.failure("no poll configured for " + showSlug, -1);
            }
            pollUrl = RESULTS_URL.replace("{pollId}", pollId);
        }

        String rawJs;
        try {
            rawJs = Jsoup.connect(pollUrl)
                .userAgent("Mozilla/5.0 (compatible; FanMeterBot/1.0; +https://fanmeter.in)")
                .timeout(15_000)
                .ignoreContentType(true)
                .execute()
                .body();
        } catch (Exception e) {
            log.warn("[TamilGlitz] Fetch failed for {}: {}", pollUrl, e.getMessage());
            return FetchResult.failure(e.getMessage(), -1);
        }

        return parseResponse(showSlug, pollUrl, rawJs);
    }

    public FetchResult parseResponse(String showSlug, String pollUrl, String rawJs) {
        // The response is JS that sets innerHTML — extract the embedded HTML fragment
        // It contains: <ul id="pds-results">...<li class="pds-feedback-group">...</ul>
        // and: <div class="pds-total-votes">Total Votes: <span>473,447</span></div>
        Document doc = Jsoup.parse(rawJs);

        Elements liItems = doc.select("li.pds-feedback-group");
        if (liItems.isEmpty()) {
            // response might be a raw JS string — try parsing the innerHTML string value
            int htmlStart = rawJs.indexOf("<ul");
            if (htmlStart < 0) htmlStart = rawJs.indexOf("<li");
            if (htmlStart >= 0) {
                String htmlFrag = rawJs.substring(htmlStart);
                // strip JS escaping (the response wraps HTML in a JS string with escaped quotes)
                htmlFrag = htmlFrag
                    .replace("\\'", "'")
                    .replace("\\\"", "\"")
                    .replace("\\n", "\n");
                doc = Jsoup.parse(htmlFrag);
                liItems = doc.select("li.pds-feedback-group");
            }
        }

        if (liItems.isEmpty()) {
            log.warn("[TamilGlitz] No pds-feedback-group elements found in response for {}", pollUrl);
            return FetchResult.failure("no vote data found in response", 200);
        }

        List<CandidateObservation> observations = new ArrayList<>();
        long totalVotes = parseTotalVotes(rawJs);
        int rank = 1;

        for (Element li : liItems) {
            String name = "";
            Element nameEl = li.selectFirst("span.pds-answer-text");
            if (nameEl != null) {
                name = nameEl.attr("title");
                if (name.isBlank()) name = nameEl.text();
            }
            if (name.isBlank()) continue;

            long votes = 0;
            Element votesEl = li.selectFirst("span.pds-feedback-votes");
            if (votesEl != null) {
                Matcher m = VOTES_PAT.matcher(votesEl.text());
                if (m.find()) {
                    votes = Long.parseLong(m.group(1).replace(",", ""));
                }
            }

            double pct = 0;
            Element pctEl = li.selectFirst("span.pds-feedback-per");
            if (pctEl != null) {
                try {
                    pct = Double.parseDouble(pctEl.text().replace("%", "").trim());
                } catch (NumberFormatException ignored) {}
            }
            // Fallback: derive pct from votes/total
            if (pct == 0 && totalVotes > 0 && votes > 0) {
                pct = (votes * 100.0) / totalVotes;
            }

            observations.add(new CandidateObservation(name, null, votes, pct, rank++));
        }

        if (observations.isEmpty()) {
            return FetchResult.failure("no contestant vote data parsed", 200);
        }

        log.info("[TamilGlitz] {} — {} contestants, {} total votes",
            showSlug, observations.size(), totalVotes);

        return new FetchResult(
            true,
            "Current Week",
            null,
            totalVotes > 0 ? totalVotes : null,
            null,
            observations,
            null,
            200
        );
    }

    private long parseTotalVotes(String rawJs) {
        // Look for "Total Votes: <span>473,447</span>" or "Total Votes: 473,447"
        int idx = rawJs.indexOf("Total Votes");
        if (idx < 0) return 0;
        String snippet = rawJs.substring(idx, Math.min(idx + 100, rawJs.length()));
        Matcher m = TOTAL_PAT.matcher(snippet.replaceAll("[,]", "").replaceAll("[^\\d\\s]", " "));
        if (m.find()) {
            try { return Long.parseLong(m.group()); } catch (NumberFormatException ignored) {}
        }
        return 0;
    }
}
