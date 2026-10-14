package com.fanclash.api.service;

import com.fanclash.api.dto.*;
import com.fanclash.api.entity.*;
import com.fanclash.api.exception.ResourceNotFoundException;
import com.fanclash.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

// Throughput note: the atomicIncrement UPDATE (total = total + 1) is a single atomic
// SQL statement — no lost updates under concurrent load. PostgreSQL row-level locking
// serialises concurrent updates to the same counter row. At ~1000+ clicks/second
// sustained this row becomes a hot-spot; at that point introduce a Redis INCR buffer
// with a periodic flush (e.g. via Cloud Pub/Sub) rather than writing directly to PG.
@Service
@RequiredArgsConstructor
public class FavouriteService {

    private final SeasonRepository                    seasonRepository;
    private final ContestantRepository                contestantRepository;
    private final ContestantFavouriteRepository       favouriteRepository;
    private final ContestantFavouriteCountRepository  countRepository;
    private final FavouriteInnerService               innerService;

    // ── Rankings ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RankingsDto getRankings(Long seasonId, String voterKey) {
        Season season = seasonRepository.findById(seasonId)
            .orElseThrow(() -> new ResourceNotFoundException("Season not found: " + seasonId));

        // Active contestants only — eliminated are excluded from rankings but their historical votes remain
        List<Contestant> contestants = contestantRepository.findBySeasonIdAndStatus(seasonId, "active")
            .stream()
            .sorted(Comparator.comparing(Contestant::getName))
            .collect(Collectors.toList());

        // Read from pre-aggregated summary table — O(contestants), not O(total_clicks)
        Map<Long, Long> counts = countRepository.findBySeasonId(seasonId).stream()
            .collect(Collectors.toMap(
                ContestantFavouriteCount::getContestantId,
                ContestantFavouriteCount::getTotal));

        long totalActiveFavourites = contestants.stream()
            .mapToLong(c -> counts.getOrDefault(c.getId(), 0L))
            .sum();

        List<ContestantRankingDto> ranked = contestants.stream()
            .map(c -> {
                long favCount = counts.getOrDefault(c.getId(), 0L);
                double voteShare = totalActiveFavourites > 0
                    ? (favCount * 100.0) / totalActiveFavourites
                    : 0.0;
                return new ContestantRankingDto(
                    c.getId(), c.getName(), c.getSlug(),
                    c.getProfileImage(), c.getStatus(),
                    favCount, 0, voteShare);
            })
            .sorted(Comparator.comparingLong(ContestantRankingDto::favouriteCount).reversed()
                .thenComparing(ContestantRankingDto::contestantName))
            .collect(Collectors.toCollection(ArrayList::new));

        for (int i = 0; i < ranked.size(); i++) {
            ContestantRankingDto r = ranked.get(i);
            ranked.set(i, new ContestantRankingDto(
                r.contestantId(), r.contestantName(), r.contestantSlug(),
                r.profileImage(), r.status(), r.favouriteCount(), i + 1, r.voteShare()));
        }

        return new RankingsDto(
            season.getId(),
            season.getName(),
            season.getShow().getSlug(),
            ranked,
            Collections.emptySet(),
            LocalDateTime.now());
    }

    // ── Add favourite (additive, idempotent per key) ──────────────────────────

    public AddFavouriteResponse addFavourite(Long seasonId, AddFavouriteRequest req) {
        // Idempotency fast-path: if key seen before, return current count
        if (favouriteRepository.existsByIdempotencyKey(req.idempotencyKey())) {
            long currentCount = Optional.ofNullable(
                    countRepository.findTotalNative(seasonId, req.contestantId()))
                .orElse(0L);
            return new AddFavouriteResponse(true, "Already recorded (idempotent retry).",
                true, req.contestantId(), currentCount);
        }

        Season season = seasonRepository.findById(seasonId)
            .orElseThrow(() -> new ResourceNotFoundException("Season not found: " + seasonId));

        Contestant contestant = contestantRepository.findById(req.contestantId())
            .orElseThrow(() -> new ResourceNotFoundException("Contestant not found: " + req.contestantId()));

        if (!contestant.getSeason().getId().equals(seasonId)) {
            return new AddFavouriteResponse(false,
                "Contestant does not belong to this season.", false, req.contestantId(), 0);
        }

        ContestantFavourite fav = ContestantFavourite.builder()
            .season(season)
            .contestant(contestant)
            .voterKey(req.voterKey())
            .idempotencyKey(req.idempotencyKey())
            .build();

        // Single REQUIRES_NEW transaction: insert favourite row AND increment counter atomically.
        boolean inserted = innerService.tryInsertAndIncrement(fav);

        if (!inserted) {
            // Concurrent race on same idempotency key — treat as idempotent
            long currentCount = Optional.ofNullable(
                    countRepository.findTotalNative(seasonId, req.contestantId()))
                .orElse(0L);
            return new AddFavouriteResponse(true, "Already recorded (concurrent idempotent).",
                true, req.contestantId(), currentCount);
        }

        // Only increment the aggregate counter when we know the row was truly new.
        // atomicIncrement is a single UPDATE statement — safe under concurrent load.

        long newCount = Optional.ofNullable(
                countRepository.findTotalNative(seasonId, req.contestantId()))
            .orElse(1L);

        return new AddFavouriteResponse(true, "Favourite added.",
            false, req.contestantId(), newCount);
    }
}
