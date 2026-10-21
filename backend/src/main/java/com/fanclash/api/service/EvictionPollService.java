package com.fanclash.api.service;

import com.fanclash.api.dto.*;
import com.fanclash.api.entity.*;
import com.fanclash.api.exception.ResourceNotFoundException;
import com.fanclash.api.repository.*;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EvictionPollService {

    private static final int MAX_EVICTION_VOTES_PER_HOUR = 5;
    private static final DateTimeFormatter FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final EvictionPollRepository      pollRepository;
    private final EvictionNomineeRepository   nomineeRepository;
    private final EvictionVoteRepository      voteRepository;
    private final NominationSourceRepository  sourceRepository;
    private final ContestantRepository        contestantRepository;
    private final EntityManager               entityManager;
    private final SeasonRepository            seasonRepository;

    // ── Public API ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Optional<EvictionPollDto> getActivePoll(Long seasonId) {
        if (!seasonRepository.existsById(seasonId))
            throw new ResourceNotFoundException("Season not found: " + seasonId);

        // Prefer an open poll
        Optional<EvictionPoll> open = pollRepository.findTopBySeasonIdAndStatusOrderByWeekNumberDesc(seasonId, "open");
        if (open.isPresent()) return Optional.of(toDto(open.get(), buildNominees(open.get())));

        // Fall back to most recent draft (may be NEEDS_VERIFICATION or SOURCE_UNAVAILABLE)
        Optional<EvictionPoll> recent = pollRepository.findMostRecentBySeasonId(seasonId);
        if (recent.isPresent() && "draft".equals(recent.get().getStatus())) {
            return Optional.of(toDto(recent.get(), buildNominees(recent.get())));
        }

        return Optional.empty();
    }

    @Transactional(readOnly = true)
    public List<EvictionPollDto> getPollHistory(Long seasonId) {
        if (!seasonRepository.existsById(seasonId))
            throw new ResourceNotFoundException("Season not found: " + seasonId);
        List<EvictionPoll> polls = pollRepository.findHistoryBySeasonId(seasonId);
        return toDtoList(polls);
    }

    @Transactional
    public CastEvictionVoteResponse castVote(Long seasonId, CastEvictionVoteRequest req) {
        EvictionPoll poll = pollRepository.findById(req.pollId())
            .orElseThrow(() -> new ResourceNotFoundException("Eviction poll not found: " + req.pollId()));

        // Poll must belong to this season
        if (!poll.getSeason().getId().equals(seasonId))
            return new CastEvictionVoteResponse(false, "Poll does not belong to this season.", 0L, req.contestantId());

        if (!"open".equals(poll.getStatus()))
            return new CastEvictionVoteResponse(false, "This poll is not currently open.", 0L, req.contestantId());

        LocalDateTime now = LocalDateTime.now();
        if (poll.getClosesAt() != null && now.isAfter(poll.getClosesAt()))
            return new CastEvictionVoteResponse(false, "Voting has closed.", 0L, req.contestantId());
        if (poll.getOpensAt() != null && now.isBefore(poll.getOpensAt()))
            return new CastEvictionVoteResponse(false, "Voting has not opened yet.", 0L, req.contestantId());

        // Contestant must be a nominee in this poll
        if (!nomineeRepository.existsByPollIdAndContestantId(req.pollId(), req.contestantId()))
            return new CastEvictionVoteResponse(false, "Contestant is not a nominee in this poll.", 0L, req.contestantId());

        // Rate limit
        long recentVotes = voteRepository.countByVoterKeyAndPollIdAndCreatedAtAfter(
            req.voterKey(), req.pollId(), now.minusHours(1));
        if (recentVotes >= MAX_EVICTION_VOTES_PER_HOUR)
            return new CastEvictionVoteResponse(false, "You have reached the voting limit. Please try again later.", 0L, req.contestantId());

        // Duplicate vote check (DB unique constraint also guards this)
        if (voteRepository.existsByPollIdAndContestantIdAndVoterKey(req.pollId(), req.contestantId(), req.voterKey()))
            return new CastEvictionVoteResponse(false, "You have already saved this contestant in this poll.", 0L, req.contestantId());

        Contestant contestant = contestantRepository.findById(req.contestantId())
            .orElseThrow(() -> new ResourceNotFoundException("Contestant not found: " + req.contestantId()));

        try {
            EvictionVote vote = EvictionVote.builder()
                .poll(poll)
                .contestant(contestant)
                .voterKey(req.voterKey())
                .build();
            voteRepository.save(vote);
            long newCount = voteRepository.countByPollIdAndContestantId(req.pollId(), req.contestantId());
            return new CastEvictionVoteResponse(true, "Vote cast! This is an independent fan poll — not an official Bigg Boss vote.", newCount, req.contestantId());
        } catch (DataIntegrityViolationException e) {
            return new CastEvictionVoteResponse(false, "You have already saved this contestant in this poll.", 0L, req.contestantId());
        }
    }

    // ── Admin API ─────────────────────────────────────────────────────────────

    @Transactional
    public EvictionPollDto createPoll(CreateEvictionPollRequest req) {
        Season season = seasonRepository.findById(req.seasonId())
            .orElseThrow(() -> new ResourceNotFoundException("Season not found: " + req.seasonId()));

        if (pollRepository.existsBySeasonIdAndWeekNumber(req.seasonId(), req.weekNumber()))
            throw new IllegalArgumentException("Poll for week " + req.weekNumber() + " already exists for this season.");

        EvictionPoll poll = EvictionPoll.builder()
            .season(season)
            .weekNumber(req.weekNumber())
            .weekLabel(req.weekLabel())
            .voteMode(req.voteMode() != null ? req.voteMode() : "save")
            .status("draft")
            .sourceVerified(false)
            .opensAt(req.opensAt() != null ? LocalDateTime.parse(req.opensAt(), FMT) : null)
            .closesAt(req.closesAt() != null ? LocalDateTime.parse(req.closesAt(), FMT) : null)
            .build();
        return toDto(pollRepository.save(poll), Collections.emptyList());
    }

    @Transactional
    public EvictionPollDto openPoll(Long pollId) {
        EvictionPoll poll = loadPoll(pollId);
        if (!"draft".equals(poll.getStatus()) && !"closed".equals(poll.getStatus()))
            throw new IllegalStateException("Only draft polls can be opened (current: " + poll.getStatus() + ")");
        poll.setStatus("open");
        poll.setUpdatedAt(LocalDateTime.now());
        return toDto(pollRepository.save(poll), buildNominees(poll));
    }

    @Transactional
    public EvictionPollDto closePoll(Long pollId) {
        EvictionPoll poll = loadPoll(pollId);
        if (!"open".equals(poll.getStatus()))
            throw new IllegalStateException("Only open polls can be closed (current: " + poll.getStatus() + ")");
        poll.setStatus("closed");
        poll.setUpdatedAt(LocalDateTime.now());
        return toDto(pollRepository.save(poll), buildNominees(poll));
    }

    @Transactional
    public EvictionPollDto setNominees(Long pollId, SetNomineesRequest req) {
        EvictionPoll poll = loadPoll(pollId);
        if ("closed".equals(poll.getStatus()) || "archived".equals(poll.getStatus()))
            throw new IllegalStateException("Cannot modify nominees of a closed/archived poll.");

        nomineeRepository.deleteByPollId(pollId);
        entityManager.flush(); // ensure DELETE is sent before INSERTs to avoid unique-constraint violation

        Map<Long, Contestant> contestantMap = contestantRepository.findAllById(req.contestantIds())
            .stream().collect(Collectors.toMap(Contestant::getId, c -> c));

        List<EvictionNominee> nominees = req.contestantIds().stream().map(cid -> {
            Contestant c = contestantMap.get(cid);
            if (c == null) throw new ResourceNotFoundException("Contestant not found: " + cid);
            return EvictionNominee.builder()
                .poll(poll)
                .contestant(c)
                .confirmed(true)
                .addedBy(req.addedBy() != null ? req.addedBy() : "admin")
                .adminNotes(req.adminNotes())
                .build();
        }).collect(Collectors.toList());

        nomineeRepository.saveAll(nominees);
        poll.setUpdatedAt(LocalDateTime.now());
        pollRepository.save(poll);

        return toDto(poll, buildNominees(poll));
    }

    @Transactional
    public EvictionPollDto verifySources(Long pollId) {
        EvictionPoll poll = loadPoll(pollId);
        poll.setSourceVerified(true);
        poll.setUpdatedAt(LocalDateTime.now());
        return toDto(pollRepository.save(poll), buildNominees(poll));
    }

    @Transactional(readOnly = true)
    public List<EvictionPollDto> getAllPollsForSeason(Long seasonId) {
        List<EvictionPoll> polls = pollRepository.findBySeasonIdOrderByWeekNumberDesc(seasonId);
        return toDtoList(polls);
    }

    // ── Auto-close expired polls ──────────────────────────────────────────────

    @Transactional
    public void autoCloseExpiredPolls() {
        List<EvictionPoll> expired = pollRepository.findExpiredOpenPolls(LocalDateTime.now());
        for (EvictionPoll p : expired) {
            p.setStatus("closed");
            p.setUpdatedAt(LocalDateTime.now());
            pollRepository.save(p);
            log.info("[EvictionPoll] Auto-closed expired poll id={} season={} week={}", p.getId(), p.getSeason().getId(), p.getWeekNumber());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<EvictionPollDto> toDtoList(List<EvictionPoll> polls) {
        if (polls.isEmpty()) return Collections.emptyList();
        List<Long> pollIds = polls.stream().map(EvictionPoll::getId).collect(Collectors.toList());
        Map<Long, String> attributions = sourceRepository.findLatestByPollIds(pollIds).stream()
            .collect(Collectors.toMap(
                s -> s.getPoll().getId(),
                s -> "HousePulse · " + s.getRetrievedAt(),
                (a, b) -> a));
        return polls.stream()
            .map(p -> toDto(p, buildNominees(p), attributions.get(p.getId())))
            .collect(Collectors.toList());
    }

    private EvictionPoll loadPoll(Long pollId) {
        return pollRepository.findById(pollId)
            .orElseThrow(() -> new ResourceNotFoundException("Eviction poll not found: " + pollId));
    }

    private List<EvictionNomineeDto> buildNominees(EvictionPoll poll) {
        List<EvictionNominee> nominees = nomineeRepository.findByPollId(poll.getId());
        if (nominees.isEmpty()) return Collections.emptyList();

        Map<Long, Long> voteCounts = voteRepository.countVotesByPoll(poll.getId()).stream()
            .collect(Collectors.toMap(
                row -> ((Number) row[0]).longValue(),
                row -> ((Number) row[1]).longValue()));

        long totalVotes = nominees.stream()
            .mapToLong(n -> voteCounts.getOrDefault(n.getContestant().getId(), 0L) + n.getExternalVoteBoost())
            .sum();

        List<EvictionNomineeDto> result = nominees.stream().map(n -> {
            Contestant c = n.getContestant();
            long count = voteCounts.getOrDefault(c.getId(), 0L) + n.getExternalVoteBoost();
            double share = totalVotes > 0 ? (count * 100.0) / totalVotes : 0.0;
            return new EvictionNomineeDto(c.getId(), c.getName(), c.getSlug(), c.getProfileImage(), count, share, 0);
        })
        .sorted(Comparator.comparingLong(EvictionNomineeDto::voteCount).reversed()
            .thenComparing(EvictionNomineeDto::contestantName))
        .collect(Collectors.toCollection(ArrayList::new));

        for (int i = 0; i < result.size(); i++) {
            EvictionNomineeDto d = result.get(i);
            result.set(i, new EvictionNomineeDto(d.contestantId(), d.contestantName(), d.contestantSlug(),
                d.profileImage(), d.voteCount(), d.voteShare(), i + 1));
        }
        return result;
    }

    @Transactional
    public EvictionPollDto resetVotes(Long pollId) {
        EvictionPoll poll = pollRepository.findById(pollId)
            .orElseThrow(() -> new ResourceNotFoundException("Eviction poll not found: " + pollId));
        if (!"open".equals(poll.getStatus()))
            throw new IllegalStateException("Can only reset votes on an open poll (status=" + poll.getStatus() + ")");
        voteRepository.deleteByPollId(pollId);
        log.info("[EvictionAdmin] Votes reset for poll {} (season {} week {})",
            pollId, poll.getSeason().getId(), poll.getWeekNumber());
        return toDto(poll, buildNominees(poll));
    }

    private EvictionPollDto toDto(EvictionPoll p, List<EvictionNomineeDto> nominees) {
        String attribution = sourceRepository.findTopByPollIdOrderByRetrievedAtDesc(p.getId())
            .map(s -> "HousePulse · " + (p.getUpdatedAt() != null ? p.getUpdatedAt().toString() : ""))
            .orElse(null);
        return toDto(p, nominees, attribution);
    }

    private EvictionPollDto toDto(EvictionPoll p, List<EvictionNomineeDto> nominees, String attribution) {
        Season season = p.getSeason();
        return new EvictionPollDto(
            p.getId(),
            season.getId(),
            season.getName(),
            season.getShow().getSlug(),
            p.getWeekNumber(),
            p.getWeekLabel(),
            p.getVoteMode(),
            p.getStatus(),
            p.getOpensAt() != null ? p.getOpensAt().toString() : null,
            p.getClosesAt() != null ? p.getClosesAt().toString() : null,
            p.getSourceVerified(),
            p.getNominationState(),
            nominees,
            p.getUpdatedAt() != null ? p.getUpdatedAt().toString() : null,
            attribution
        );
    }
}
