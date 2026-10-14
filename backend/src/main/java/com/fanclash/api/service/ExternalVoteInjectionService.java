package com.fanclash.api.service;

import com.fanclash.api.entity.*;
import com.fanclash.api.repository.*;
import com.fanclash.api.sentiment.entity.SentimentObservation;
import com.fanclash.api.sentiment.entity.SentimentPoll;
import com.fanclash.api.sentiment.repository.SentimentObservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Applies deltas from external sentiment observations directly into FanMeter vote tables.
 *
 * On each ingest run, for every resolved contestant observation:
 *  - Computes delta = newRawCount - lastSeenRawCount (skips if <= 0)
 *  - Adds delta to contestant_favourite_counts.total (Fan Rankings)
 *  - Adds delta to eviction_nominees.external_vote_boost (Eviction tab) if nominee is active
 *  - Updates external_vote_ledger with the new last-seen count
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalVoteInjectionService {

    private final ContestantFavouriteCountRepository  favCountRepo;
    private final ExternalVoteLedgerRepository        ledgerRepo;
    private final SeasonRepository                    seasonRepo;
    private final EvictionPollRepository              evictionPollRepo;
    private final EvictionNomineeRepository           nomineeRepo;
    private final SentimentObservationRepository      obsRepo;

    @Transactional
    public void applyDeltasForShow(String sourceKey, String showSlug, SentimentPoll poll) {
        List<SentimentObservation> observations = obsRepo.findByPollId(poll.getId());

        // Only process observations resolved to a known contestant
        List<SentimentObservation> resolved = observations.stream()
            .filter(o -> o.getContestant() != null)
            .collect(Collectors.toList());

        if (resolved.isEmpty()) {
            log.debug("[VoteInjection] No resolved observations for source={} show={}", sourceKey, showSlug);
            return;
        }

        // Get the live season for this show
        List<Season> seasons = seasonRepo.findByShowSlugAndStatus(showSlug, "live");
        if (seasons.isEmpty()) {
            log.debug("[VoteInjection] No live season for show={}", showSlug);
            return;
        }
        Long seasonId = seasons.get(0).getId();

        // Get active eviction poll nominees for this season (if any)
        Map<Long, EvictionNominee> nomineeByContestantId = evictionPollRepo
            .findTopBySeasonIdAndStatusOrderByWeekNumberDesc(seasonId, "open")
            .map(p -> nomineeRepo.findByPollId(p.getId()).stream()
                .collect(Collectors.toMap(n -> n.getContestant().getId(), n -> n)))
            .orElse(Map.of());

        int favUpdated = 0;
        int evictionUpdated = 0;

        for (SentimentObservation obs : resolved) {
            long contestantId = obs.getContestant().getId();
            long newRawCount = obs.getRawCount();

            // Compute delta vs last seen
            long lastSeen = ledgerRepo
                .findBySourceKeyAndShowSlugAndContestantId(sourceKey, showSlug, contestantId)
                .map(ExternalVoteLedger::getLastRawCount)
                .orElse(0L);

            long delta = newRawCount - lastSeen;
            if (delta <= 0) continue;

            // Add to favourite counts
            int rows = favCountRepo.atomicAdd(seasonId, contestantId, delta);
            if (rows > 0) favUpdated++;

            // Add to eviction nominee boost if they're a current nominee
            EvictionNominee nominee = nomineeByContestantId.get(contestantId);
            if (nominee != null) {
                nominee.setExternalVoteBoost(nominee.getExternalVoteBoost() + delta);
                nomineeRepo.save(nominee);
                evictionUpdated++;
            }

            // Update ledger
            ledgerRepo.upsert(sourceKey, showSlug, contestantId, newRawCount);

            log.debug("[VoteInjection] source={} show={} contestant={} delta=+{} ({}→{})",
                sourceKey, showSlug, obs.getContestant().getName(), delta, lastSeen, newRawCount);
        }

        log.info("[VoteInjection] source={} show={} favUpdated={} evictionUpdated={}",
            sourceKey, showSlug, favUpdated, evictionUpdated);
    }
}
