package com.fanclash.api.service;

import com.fanclash.api.dto.*;
import com.fanclash.api.entity.*;
import com.fanclash.api.exception.ResourceNotFoundException;
import com.fanclash.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VoteService {

    private static final int MAX_VOTES_PER_VOTER_PER_HOUR = 5;

    private final VotingRoundRepository votingRoundRepository;
    private final FanVoteRepository fanVoteRepository;
    private final ContestantRepository contestantRepository;
    private final SeasonRepository seasonRepository;

    @Transactional(readOnly = true)
    public VotingRoundDto getActiveRound(Long seasonId) {
        if (!seasonRepository.existsById(seasonId)) {
            throw new ResourceNotFoundException("Season not found: " + seasonId);
        }
        VotingRound round = votingRoundRepository.findActiveRoundBySeasonId(seasonId)
                .orElseThrow(() -> new ResourceNotFoundException("No open voting round for season: " + seasonId));
        return toDto(round, buildResults(round));
    }

    @Transactional(readOnly = true)
    public VotingRoundDto getRoundResults(Long roundId) {
        VotingRound round = votingRoundRepository.findById(roundId)
                .orElseThrow(() -> new ResourceNotFoundException("Voting round not found: " + roundId));
        return toDto(round, buildResults(round));
    }

    @Transactional
    public CastVoteResponse castVote(CastVoteRequest req) {
        VotingRound round = votingRoundRepository.findById(req.votingRoundId())
                .orElseThrow(() -> new ResourceNotFoundException("Voting round not found: " + req.votingRoundId()));

        if (!"open".equals(round.getStatus())) {
            return new CastVoteResponse(false, "Voting is not currently open.", null, req.contestantId(), 0);
        }
        LocalDateTime now = LocalDateTime.now();
        if (round.getClosesAt() != null && now.isAfter(round.getClosesAt())) {
            return new CastVoteResponse(false, "Voting has closed.", null, req.contestantId(), 0);
        }
        if (round.getOpensAt() != null && now.isBefore(round.getOpensAt())) {
            return new CastVoteResponse(false, "Voting has not opened yet.", null, req.contestantId(), 0);
        }

        Contestant contestant = contestantRepository.findById(req.contestantId())
                .orElseThrow(() -> new ResourceNotFoundException("Contestant not found: " + req.contestantId()));

        // Contestant must belong to the round's season
        if (!contestant.getSeason().getId().equals(round.getSeason().getId())) {
            return new CastVoteResponse(false, "Contestant does not belong to this voting round.", null, req.contestantId(), 0);
        }

        // Contestant must be active (eligible)
        if (!"active".equals(contestant.getStatus())) {
            return new CastVoteResponse(false, "Contestant is not eligible to receive votes.", null, req.contestantId(), 0);
        }

        // Rate-limit: max 5 votes per voter per round per hour
        long recentVotes = fanVoteRepository.countByVoterKeyAndVotingRoundIdAndCreatedAtAfter(
                req.voterKey(), req.votingRoundId(), now.minusHours(1));
        if (recentVotes >= MAX_VOTES_PER_VOTER_PER_HOUR) {
            return new CastVoteResponse(false, "You have reached the voting limit. Please try again later.", null, req.contestantId(), 0);
        }

        // Duplicate check via DB unique constraint (also caught below via DataIntegrityViolationException)
        if (fanVoteRepository.existsByVotingRoundIdAndContestantIdAndVoterKey(
                req.votingRoundId(), req.contestantId(), req.voterKey())) {
            return new CastVoteResponse(false, "You have already voted for this contestant in this round.", null, req.contestantId(), 0);
        }

        try {
            FanVote vote = FanVote.builder()
                    .votingRound(round)
                    .contestant(contestant)
                    .voterKey(req.voterKey())
                    .build();
            FanVote saved = fanVoteRepository.save(vote);

            // Count updated total for this contestant in this round
            long total = fanVoteRepository.countVotesByRound(round.getId()).stream()
                    .filter(row -> req.contestantId().equals(((Number) row[0]).longValue()))
                    .mapToLong(row -> ((Number) row[1]).longValue())
                    .sum();

            return new CastVoteResponse(true, "Vote cast successfully! This is an unofficial FanClash community poll.", saved.getId(), req.contestantId(), total);
        } catch (DataIntegrityViolationException e) {
            return new CastVoteResponse(false, "You have already voted for this contestant in this round.", null, req.contestantId(), 0);
        }
    }

    private List<ContestantVoteDto> buildResults(VotingRound round) {
        // Get all contestants in the season
        List<Contestant> contestants = contestantRepository.findBySeasonIdOrderByNameAsc(round.getSeason().getId());

        // Get vote counts as a map
        Map<Long, Long> voteCounts = fanVoteRepository.countVotesByRound(round.getId()).stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).longValue(),
                        row -> ((Number) row[1]).longValue()));

        // Build and sort by votes desc
        List<ContestantVoteDto> results = contestants.stream()
                .filter(c -> "active".equals(c.getStatus()))
                .map(c -> new ContestantVoteDto(
                        c.getId(), c.getName(), c.getSlug(),
                        c.getProfileImage(), c.getStatus(),
                        voteCounts.getOrDefault(c.getId(), 0L), 0))
                .sorted(Comparator.comparingLong(ContestantVoteDto::voteCount).reversed())
                .collect(Collectors.toCollection(ArrayList::new));

        // Assign ranks
        for (int i = 0; i < results.size(); i++) {
            ContestantVoteDto old = results.get(i);
            results.set(i, new ContestantVoteDto(
                    old.contestantId(), old.contestantName(), old.contestantSlug(),
                    old.profileImage(), old.status(), old.voteCount(), i + 1));
        }
        return results;
    }

    private VotingRoundDto toDto(VotingRound round, List<ContestantVoteDto> results) {
        Season season = round.getSeason();
        return new VotingRoundDto(
                round.getId(),
                season.getId(),
                season.getName(),
                season.getShow().getSlug(),
                round.getTitle(),
                round.getStatus(),
                round.getOpensAt(),
                round.getClosesAt(),
                round.getCreatedAt(),
                results);
    }
}
