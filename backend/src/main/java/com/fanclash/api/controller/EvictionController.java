package com.fanclash.api.controller;

import com.fanclash.api.dto.*;
import com.fanclash.api.exception.ResourceNotFoundException;
import com.fanclash.api.service.EvictionPollService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Public-facing eviction poll endpoints.
 *
 * GET  /api/seasons/{seasonId}/eviction-poll    → current open poll (null if none)
 * GET  /api/seasons/{seasonId}/eviction-history → past polls
 * POST /api/seasons/{seasonId}/eviction-vote    → cast a save vote
 */
@RestController
@RequiredArgsConstructor
public class EvictionController {

    private final EvictionPollService evictionPollService;

    @GetMapping("/api/seasons/{seasonId}/eviction-poll")
    public ResponseEntity<ApiResponse<EvictionPollDto>> getActivePoll(@PathVariable Long seasonId) {
        try {
            Optional<EvictionPollDto> poll = evictionPollService.getActivePoll(seasonId);
            if (poll.isEmpty()) {
                return ResponseEntity.ok(ApiResponse.ok("No active eviction poll.", null));
            }
            return ResponseEntity.ok(ApiResponse.ok(poll.get()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/api/seasons/{seasonId}/eviction-history")
    public ResponseEntity<ApiResponse<List<EvictionPollDto>>> getPollHistory(@PathVariable Long seasonId) {
        try {
            return ResponseEntity.ok(ApiResponse.ok(evictionPollService.getPollHistory(seasonId)));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/api/seasons/{seasonId}/eviction-vote")
    public ResponseEntity<ApiResponse<CastEvictionVoteResponse>> castVote(
            @PathVariable Long seasonId,
            @RequestBody CastEvictionVoteRequest req) {
        CastEvictionVoteResponse result = evictionPollService.castVote(seasonId, req);
        return ResponseEntity.ok(result.success()
            ? ApiResponse.ok(result)
            : ApiResponse.error(result.message(), result));
    }
}
