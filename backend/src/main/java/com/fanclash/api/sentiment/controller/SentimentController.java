package com.fanclash.api.sentiment.controller;

import com.fanclash.api.sentiment.dto.SentimentSummaryDto;
import com.fanclash.api.sentiment.entity.*;
import com.fanclash.api.sentiment.repository.*;
import com.fanclash.api.sentiment.service.SentimentCalculationService;
import com.fanclash.api.sentiment.service.SentimentIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Public read-only sentiment API.
 *
 * GET /api/events/{eventSlug}/sentiment          — combined score summary for latest period
 * GET /api/events/{eventSlug}/sentiment?period=X — summary for a specific period
 */
@Slf4j
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class SentimentController {

    /** Maps event slugs (with season suffix) to show slugs (without season suffix) */
    private static final Map<String, String> EVENT_TO_SHOW = Map.of(
        "bigg-boss-tamil-10",    "bigg-boss-tamil",
        "bigg-boss-telugu-10",   "bigg-boss-telugu",
        "bigg-boss-malayalam-8", "bigg-boss-malayalam",
        "bigg-boss-kannada-13",  "bigg-boss-kannada",
        "bigg-boss-hindi-20",    "bigg-boss-hindi",
        "bigg-boss-bangla-3",    "bigg-boss-bangla"
    );

    private final SentimentScoreSnapshotRepository snapshotRepository;
    private final SentimentObservationRepository observationRepository;
    private final SentimentPollRepository pollRepository;
    private final SentimentSourceRepository sourceRepository;
    private final SentimentCalculationService calculationService;
    private final SentimentIngestionService ingestionService;

    @GetMapping("/{eventSlug}/sentiment")
    public ResponseEntity<SentimentSummaryDto> getSentiment(
            @PathVariable String eventSlug,
            @RequestParam(required = false) String period) {

        String showSlug = EVENT_TO_SHOW.get(eventSlug);
        if (showSlug == null) return ResponseEntity.notFound().build();

        // Determine period
        String resolvedPeriod = period;
        if (resolvedPeriod == null) {
            List<SentimentPoll> polls = pollRepository.findByShowSlugOrderByFetchedAtDesc(showSlug);
            if (polls.isEmpty()) return ResponseEntity.ok(emptySummary(showSlug));
            resolvedPeriod = polls.get(0).getPeriodLabel();
        }

        // Load snapshots for this show + period
        List<SentimentScoreSnapshot> snapshots =
            snapshotRepository.findByShowSlugAndPeriodLabelOrderByCombinedScoreDesc(showSlug, resolvedPeriod);

        if (snapshots.isEmpty()) {
            // Try to compute on-demand
            calculationService.computeScores(showSlug, resolvedPeriod);
            snapshots = snapshotRepository.findByShowSlugAndPeriodLabelOrderByCombinedScoreDesc(showSlug, resolvedPeriod);
        }

        if (snapshots.isEmpty()) return ResponseEntity.ok(emptySummary(showSlug));

        // Load source observations for the resolved contestants
        Set<Long> contestantIds = snapshots.stream()
            .map(s -> s.getContestant().getId())
            .collect(Collectors.toSet());

        List<SentimentObservation> observations =
            observationRepository.findByShowSlugAndPeriodLabel(showSlug, resolvedPeriod);

        // Group observations by contestant
        Map<Long, List<SentimentObservation>> obsByContestant = observations.stream()
            .filter(o -> o.getContestant() != null)
            .collect(Collectors.groupingBy(o -> o.getContestant().getId()));

        // Build source display name map
        Map<Long, String> sourceNames = sourceRepository.findAll().stream()
            .collect(Collectors.toMap(SentimentSource::getId, SentimentSource::getDisplayName));
        Map<Long, String> sourceKeys = sourceRepository.findAll().stream()
            .collect(Collectors.toMap(SentimentSource::getId, SentimentSource::getSourceKey));
        Map<Long, String> sourcePollUrls = new HashMap<>();
        for (SentimentPoll p : pollRepository.findByShowSlugAndPeriodLabelOrderByFetchedAtDesc(showSlug, resolvedPeriod)) {
            sourcePollUrls.put(p.getSource().getId(), p.getPollUrl());
        }

        int rank = 1;
        List<SentimentSummaryDto.ContestantSentimentDto> contestants = new ArrayList<>();
        for (SentimentScoreSnapshot snap : snapshots) {
            Long cId = snap.getContestant().getId();
            List<SentimentObservation> cObs = obsByContestant.getOrDefault(cId, List.of());

            List<SentimentSummaryDto.SourceObservationDto> sourceData = cObs.stream()
                .map(o -> new SentimentSummaryDto.SourceObservationDto(
                    sourceKeys.getOrDefault(o.getPoll().getSource().getId(), "unknown"),
                    sourceNames.getOrDefault(o.getPoll().getSource().getId(), "Unknown"),
                    sourcePollUrls.getOrDefault(o.getPoll().getSource().getId(), null),
                    o.getRawCount(),
                    o.getSharePct(),
                    o.getRankPosition() != null ? o.getRankPosition() : 0
                ))
                .collect(Collectors.toList());

            BigDecimal fanSharePct = snap.getFanmeterShare() != null
                ? snap.getFanmeterShare().multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

            contestants.add(new SentimentSummaryDto.ContestantSentimentDto(
                cId,
                snap.getContestant().getName(),
                snap.getContestant().getSlug(),
                snap.getContestant().getProfileImage(),
                snap.getFanmeterVotes(),
                fanSharePct,
                snap.getExternalScore(),
                snap.getCombinedScore(),
                rank++,
                sourceData
            ));
        }

        SentimentSummaryDto dto = new SentimentSummaryDto(
            showSlug,
            resolvedPeriod,
            snapshots.isEmpty() ? 0 : snapshots.get(0).getSourcesUsed(),
            snapshots.isEmpty() ? null : snapshots.get(0).getComputedAt(),
            contestants
        );
        return ResponseEntity.ok(dto);
    }

    private SentimentSummaryDto emptySummary(String showSlug) {
        return new SentimentSummaryDto(showSlug, null, 0, null, List.of());
    }
}
