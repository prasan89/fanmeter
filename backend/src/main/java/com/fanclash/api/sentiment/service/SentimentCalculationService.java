package com.fanclash.api.sentiment.service;

import com.fanclash.api.entity.Contestant;
import com.fanclash.api.entity.Season;
import com.fanclash.api.repository.ContestantFavouriteCountRepository;
import com.fanclash.api.repository.ContestantRepository;
import com.fanclash.api.repository.SeasonRepository;
import com.fanclash.api.sentiment.entity.*;
import com.fanclash.api.sentiment.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Computes normalized Fan Sentiment Scores using external poll signals and FanMeter votes.
 *
 * External score formula (per contestant c, for show in period):
 *   p_s_c = x_s_c / sum(x_s_j  for j in all nominees in poll s)
 *   E_c   = 100 * sum(w_s * p_s_c) / sum(w_s)
 *
 * Combined score = average of normalized external score and FanMeter vote share (equal weight).
 *
 * INTEGRITY: This service reads contestant_favourite_counts but NEVER writes to it.
 * It only writes to sentiment_score_snapshots.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SentimentCalculationService {

    private final SentimentSourceRepository sourceRepository;
    private final SentimentPollRepository pollRepository;
    private final SentimentObservationRepository observationRepository;
    private final SentimentScoreSnapshotRepository snapshotRepository;
    private final ContestantFavouriteCountRepository favouriteCountRepository;
    private final ContestantRepository contestantRepository;
    private final SeasonRepository seasonRepository;

    /**
     * Compute and persist score snapshots for a show for a given period.
     * If periodLabel is null, uses the most recent period available.
     */
    @Transactional
    public ComputeResult computeScores(String showSlug, String periodLabel) {
        // Find the latest period if not specified
        if (periodLabel == null) {
            List<SentimentPoll> polls = pollRepository.findByShowSlugOrderByFetchedAtDesc(showSlug);
            if (polls.isEmpty()) {
                log.warn("[SentimentCalc] No polls found for {}", showSlug);
                return new ComputeResult(showSlug, periodLabel, 0, "no polls found");
            }
            periodLabel = polls.get(0).getPeriodLabel();
        }

        // Load all polls for this show + period across enabled sources
        final String effectivePeriodLabel = periodLabel;
        List<SentimentPoll> polls = pollRepository.findByShowSlugAndPeriodLabelOrderByFetchedAtDesc(showSlug, effectivePeriodLabel);
        if (polls.isEmpty()) {
            return new ComputeResult(showSlug, effectivePeriodLabel, 0, "no polls for period " + effectivePeriodLabel);
        }

        // Load observations grouped by poll
        Map<Long, List<SentimentObservation>> obsByPoll = new HashMap<>();
        for (SentimentPoll poll : polls) {
            obsByPoll.put(poll.getId(), observationRepository.findByPollId(poll.getId()));
        }

        // Collect all resolved contestant IDs
        Set<Long> contestantIds = obsByPoll.values().stream()
            .flatMap(List::stream)
            .filter(o -> o.getContestant() != null && o.getResolved())
            .map(o -> o.getContestant().getId())
            .collect(Collectors.toSet());

        if (contestantIds.isEmpty()) {
            return new ComputeResult(showSlug, effectivePeriodLabel, 0, "no resolved contestants");
        }

        // Load FanMeter vote counts for this show
        List<Season> seasons = seasonRepository.findByShowSlugAndStatus(showSlug, "live");
        Long seasonId = seasons.isEmpty() ? null : seasons.get(0).getId();
        Map<Long, Long> fanmeterVotes = loadFanmeterVotes(seasonId, contestantIds);
        long totalFanmeterVotes = fanmeterVotes.values().stream().mapToLong(Long::longValue).sum();

        // Compute external score per contestant per source
        // w_s = source weight, p_s_c = contestant share within poll s
        Map<Long, BigDecimal> externalScores = computeExternalScores(polls, obsByPoll, contestantIds);

        // Upsert score snapshots
        int saved = 0;
        for (Long contestantId : contestantIds) {
            long fanVotes = fanmeterVotes.getOrDefault(contestantId, 0L);
            BigDecimal fanShare = totalFanmeterVotes > 0
                ? BigDecimal.valueOf(fanVotes).divide(BigDecimal.valueOf(totalFanmeterVotes), 6, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

            BigDecimal extScore = externalScores.getOrDefault(contestantId, null);

            BigDecimal combined = computeCombinedScore(extScore, fanShare);

            Contestant contestant = contestantRepository.findById(contestantId).orElse(null);
            if (contestant == null) continue;
            final Contestant finalContestant = contestant;

            SentimentScoreSnapshot snapshot = snapshotRepository
                .findByShowSlugAndContestantIdAndPeriodLabel(showSlug, contestantId, effectivePeriodLabel)
                .orElseGet(() -> SentimentScoreSnapshot.builder()
                    .showSlug(showSlug)
                    .contestant(finalContestant)
                    .periodLabel(effectivePeriodLabel)
                    .build());

            snapshot.setFanmeterVotes(fanVotes);
            snapshot.setFanmeterShare(fanShare.setScale(4, RoundingMode.HALF_UP));
            snapshot.setExternalScore(extScore != null ? extScore.setScale(4, RoundingMode.HALF_UP) : null);
            snapshot.setCombinedScore(combined != null ? combined.setScale(4, RoundingMode.HALF_UP) : null);
            snapshot.setSourcesUsed(polls.size());
            snapshotRepository.save(snapshot);
            saved++;
        }

        log.info("[SentimentCalc] show={} period={} snapshots={}", showSlug, effectivePeriodLabel, saved);
        return new ComputeResult(showSlug, effectivePeriodLabel, saved, null);
    }

    /** Compute all shows for the latest available period. */
    public List<ComputeResult> computeAllShows() {
        List<ComputeResult> results = new ArrayList<>();
        for (String showSlug : SentimentIngestionService.SEASON_SEGMENTS.keySet()) {
            try {
                results.add(computeScores(showSlug, null));
            } catch (Exception e) {
                log.error("[SentimentCalc] Failed for show {}: {}", showSlug, e.getMessage(), e);
                results.add(new ComputeResult(showSlug, null, 0, e.getMessage()));
            }
        }
        return results;
    }

    // ── Computation helpers ───────────────────────────────────────────────────

    private Map<Long, BigDecimal> computeExternalScores(
            List<SentimentPoll> polls,
            Map<Long, List<SentimentObservation>> obsByPoll,
            Set<Long> contestantIds) {

        // weighted sum numerator and denominator per contestant
        Map<Long, BigDecimal> weightedSum = new HashMap<>();
        Map<Long, BigDecimal> weightDenominator = new HashMap<>();

        for (Long cId : contestantIds) {
            weightedSum.put(cId, BigDecimal.ZERO);
            weightDenominator.put(cId, BigDecimal.ZERO);
        }

        for (SentimentPoll poll : polls) {
            List<SentimentObservation> obs = obsByPoll.getOrDefault(poll.getId(), List.of());
            if (obs.isEmpty()) continue;

            // Total raw count in this poll (only resolved contestants)
            long pollTotal = obs.stream()
                .filter(o -> o.getContestant() != null && o.getResolved())
                .mapToLong(SentimentObservation::getRawCount)
                .sum();
            if (pollTotal == 0) continue;

            BigDecimal weight = poll.getSource().getWeight();

            for (SentimentObservation o : obs) {
                if (o.getContestant() == null || !o.getResolved()) continue;
                Long cId = o.getContestant().getId();
                if (!contestantIds.contains(cId)) continue;

                // p_s_c = share within this poll
                BigDecimal share = BigDecimal.valueOf(o.getRawCount())
                    .divide(BigDecimal.valueOf(pollTotal), 8, RoundingMode.HALF_UP);

                weightedSum.put(cId, weightedSum.get(cId).add(weight.multiply(share)));
                weightDenominator.put(cId, weightDenominator.get(cId).add(weight));
            }
        }

        // E_c = 100 * sum(w_s * p_s_c) / sum(w_s)
        Map<Long, BigDecimal> scores = new HashMap<>();
        for (Long cId : contestantIds) {
            BigDecimal denom = weightDenominator.get(cId);
            if (denom.compareTo(BigDecimal.ZERO) > 0) {
                scores.put(cId, BigDecimal.valueOf(100)
                    .multiply(weightedSum.get(cId))
                    .divide(denom, 4, RoundingMode.HALF_UP));
            }
        }
        return scores;
    }

    private BigDecimal computeCombinedScore(BigDecimal externalScore, BigDecimal fanmeterShare) {
        // combined = average of external score (0-100) and fanmeter share scaled to 0-100
        BigDecimal fanScaled = fanmeterShare.multiply(BigDecimal.valueOf(100));
        if (externalScore == null) return fanScaled;
        return externalScore.add(fanScaled).divide(BigDecimal.valueOf(2), 4, RoundingMode.HALF_UP);
    }

    private Map<Long, Long> loadFanmeterVotes(Long seasonId, Set<Long> contestantIds) {
        if (seasonId == null) return Map.of();
        Map<Long, Long> result = new HashMap<>();
        for (Long cId : contestantIds) {
            Long count = favouriteCountRepository.findTotalNative(seasonId, cId);
            if (count != null) result.put(cId, count);
        }
        return result;
    }

    // ── Records ───────────────────────────────────────────────────────────────

    public record ComputeResult(String showSlug, String periodLabel, int snapshotsSaved, String error) {}
}
