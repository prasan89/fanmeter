package com.fanclash.api.controller;

import com.fanclash.api.dto.*;
import com.fanclash.api.service.VoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class VoteController {

    private final VoteService voteService;

    /** GET /api/seasons/{seasonId}/active-round — current open round with results */
    @GetMapping("/api/seasons/{seasonId}/active-round")
    public ResponseEntity<ApiResponse<VotingRoundDto>> getActiveRound(@PathVariable Long seasonId) {
        return ResponseEntity.ok(ApiResponse.ok(voteService.getActiveRound(seasonId)));
    }

    /** GET /api/voting-rounds/{roundId}/results — vote totals for a specific round */
    @GetMapping("/api/voting-rounds/{roundId}/results")
    public ResponseEntity<ApiResponse<VotingRoundDto>> getRoundResults(@PathVariable Long roundId) {
        return ResponseEntity.ok(ApiResponse.ok(voteService.getRoundResults(roundId)));
    }

    /** POST /api/votes — cast a vote */
    @PostMapping("/api/votes")
    public ResponseEntity<ApiResponse<CastVoteResponse>> castVote(@Valid @RequestBody CastVoteRequest req) {
        CastVoteResponse result = voteService.castVote(req);
        ApiResponse<CastVoteResponse> response = result.success()
                ? ApiResponse.ok(result)
                : ApiResponse.error(result.message(), result);
        return ResponseEntity.ok(response);
    }
}
