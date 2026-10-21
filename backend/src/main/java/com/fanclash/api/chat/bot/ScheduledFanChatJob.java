package com.fanclash.api.chat.bot;

import com.fanclash.api.chat.service.ChatService;
import com.fanclash.api.dto.ContestantRankingDto;
import com.fanclash.api.dto.RankingsDto;
import com.fanclash.api.service.FavouriteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Generates scheduled fan-style comments for all live BB Tamil S10 chat rooms.
 *
 * Configuration (application.yml):
 * <pre>
 * fanmeter:
 *   chat:
 *     bot:
 *       enabled: true                           # set false to disable entirely
 *       cron: "0 0/30 * * * *"                 # every 30 minutes
 *       min-comments: 5
 *       max-comments: 10
 *       max-per-contestant: 3
 * </pre>
 *
 * Single-instance safety: AtomicBoolean prevents overlap on slow runs.
 * Multi-instance deployments should use ShedLock (not in pom yet); the boolean
 * guard keeps behaviour correct for the current single Cloud Run deployment.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "fanmeter.chat.bot.enabled", havingValue = "true", matchIfMissing = false)
public class ScheduledFanChatJob {

    // ── Bot identity constants ─────────────────────────────────────────────────

    public static final String BOT_TOKEN        = "chat_guest_fanmeterbot_scheduled_0000000000";
    public static final String BOT_DISPLAY_NAME = "FanMeterBot";
    public static final String BOT_TYPE         = "FAN_COMMENT_BOT";

    // ── Config ────────────────────────────────────────────────────────────────

    @Value("${fanmeter.chat.bot.min-comments:5}")
    private int minComments;

    @Value("${fanmeter.chat.bot.max-comments:10}")
    private int maxComments;

    @Value("${fanmeter.chat.bot.max-per-contestant:3}")
    private int maxPerContestant;

    /** Comma-separated list of "eventSlug:seasonId" pairs to generate comments for. */
    @Value("${fanmeter.chat.bot.targets:bigg-boss-tamil-10:6}")
    private String targets;

    // ── Deps ──────────────────────────────────────────────────────────────────

    private final FavouriteService    favouriteService;
    private final FanCommentGenerator commentGenerator;
    private final ChatService         chatService;

    // ── Single-instance overlap guard ────────────────────────────────────────

    private final AtomicBoolean running = new AtomicBoolean(false);

    // ── Scheduled execution ───────────────────────────────────────────────────

    @Scheduled(cron = "${fanmeter.chat.bot.cron:0 0/30 * * * *}")
    public void run() {
        if (!running.compareAndSet(false, true)) {
            log.info("[BotChat] Previous run still in progress — skipping this tick.");
            return;
        }
        try {
            executeRun();
        } finally {
            running.set(false);
        }
    }

    /** Visible for testing — same logic as the scheduled entry point. */
    public void executeRun() {
        long start = System.currentTimeMillis();
        int totalPublished = 0;
        int totalSkipped   = 0;

        for (String target : targets.split(",")) {
            target = target.trim();
            if (target.isBlank()) continue;

            String[] parts = target.split(":");
            if (parts.length != 2) {
                log.warn("[BotChat] Invalid target format '{}', expected 'eventSlug:seasonId'", target);
                continue;
            }

            String eventSlug = parts[0];
            long   seasonId;
            try {
                seasonId = Long.parseLong(parts[1]);
            } catch (NumberFormatException e) {
                log.warn("[BotChat] Bad seasonId in target '{}': {}", target, e.getMessage());
                continue;
            }

            String roomId = "event:" + eventSlug + ":season:" + seasonId;

            try {
                int[] result = runForRoom(roomId, seasonId);
                totalPublished += result[0];
                totalSkipped   += result[1];
            } catch (Exception e) {
                log.error("[BotChat] Error generating comments for room {}: {}", roomId, e.getMessage(), e);
            }
        }

        long elapsed = System.currentTimeMillis() - start;
        log.info("[BotChat] Run complete in {}ms — published={} skipped={}", elapsed, totalPublished, totalSkipped);
    }

    private int[] runForRoom(String roomId, long seasonId) {
        // 1. Load current rankings
        RankingsDto rankingsDto;
        try {
            rankingsDto = favouriteService.getRankings(seasonId, null);
        } catch (Exception e) {
            log.warn("[BotChat] Could not load rankings for seasonId={}: {}", seasonId, e.getMessage());
            return new int[]{0, 0};
        }

        List<ContestantRankingDto> rankings = rankingsDto.rankings();
        if (rankings == null || rankings.isEmpty()) {
            log.info("[BotChat] No ranking data for room {} — skipping run.", roomId);
            return new int[]{0, 0};
        }

        // 2. Determine how many comments to generate this run
        int count = minComments + new Random().nextInt(Math.max(1, maxComments - minComments + 1));

        // 3. Generate comment texts
        List<String> texts = commentGenerator.generate(rankings, count, maxPerContestant);

        if (texts.isEmpty()) {
            log.info("[BotChat] Generator returned no texts for room {}", roomId);
            return new int[]{0, 0};
        }

        // 4. Publish each comment with a small random delay to appear organic
        int published = 0;
        int skipped   = 0;
        for (String text : texts) {
            String idempotencyKey = "bot_" + roomId + "_" + Instant.now().toEpochMilli()
                    + "_" + published;
            var result = chatService.publishBotMessage(
                    roomId, BOT_TOKEN, BOT_DISPLAY_NAME, text, BOT_TYPE, idempotencyKey);
            if (result.isPresent()) {
                published++;
                log.debug("[BotChat] Published: [{}] {}", roomId, text);
            } else {
                skipped++;
                log.debug("[BotChat] Skipped (moderation): [{}] {}", roomId, text);
            }

            // Small inter-message pause — avoids rate-limiting side effects and
            // spreads messages over a few seconds for a more natural appearance
            try { Thread.sleep(200 + new Random().nextInt(300)); }
            catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            }
        }

        log.info("[BotChat] Room {} — published={} skipped={}", roomId, published, skipped);
        return new int[]{published, skipped};
    }
}
