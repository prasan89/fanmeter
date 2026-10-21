package com.fanclash.api.controller;

import com.fanclash.api.dto.*;
import com.fanclash.api.service.EvictionPollService;
import com.fanclash.api.sync.NominationSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin API for eviction poll lifecycle management.
 * Secured by X-Admin-Secret header (see AdminAuthInterceptor).
 *
 * POST /api/admin/eviction/polls                     → create draft poll
 * PUT  /api/admin/eviction/polls/{id}/open           → open poll
 * PUT  /api/admin/eviction/polls/{id}/close          → close poll
 * PUT  /api/admin/eviction/polls/{id}/nominees       → set nominee list
 * PUT  /api/admin/eviction/polls/{id}/verify-sources → mark source_verified=true
 * GET  /api/admin/eviction/polls/season/{seasonId}   → all polls for season
 * GET  /api/admin/nomination-sync/status             → last 20 sync logs
 * POST /api/admin/nomination-sync/trigger            → trigger sync (Cloud Scheduler target)
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class EvictionAdminController {

    private final EvictionPollService  evictionPollService;
    private final NominationSyncService nominationSyncService;

    // ── Poll lifecycle ────────────────────────────────────────────────────────

    @PostMapping("/eviction/polls")
    public ResponseEntity<ApiResponse<EvictionPollDto>> createPoll(@RequestBody CreateEvictionPollRequest req) {
        try {
            return ResponseEntity.ok(ApiResponse.ok(evictionPollService.createPoll(req)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/eviction/polls/{pollId}/open")
    public ResponseEntity<ApiResponse<EvictionPollDto>> openPoll(@PathVariable Long pollId) {
        try {
            return ResponseEntity.ok(ApiResponse.ok(evictionPollService.openPoll(pollId)));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/eviction/polls/{pollId}/close")
    public ResponseEntity<ApiResponse<EvictionPollDto>> closePoll(@PathVariable Long pollId) {
        try {
            return ResponseEntity.ok(ApiResponse.ok(evictionPollService.closePoll(pollId)));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/eviction/polls/{pollId}/nominees")
    public ResponseEntity<ApiResponse<EvictionPollDto>> setNominees(
            @PathVariable Long pollId,
            @RequestBody SetNomineesRequest req) {
        try {
            return ResponseEntity.ok(ApiResponse.ok(evictionPollService.setNominees(pollId, req)));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/eviction/polls/{pollId}/verify-sources")
    public ResponseEntity<ApiResponse<EvictionPollDto>> verifySources(@PathVariable Long pollId) {
        return ResponseEntity.ok(ApiResponse.ok(evictionPollService.verifySources(pollId)));
    }

    @PostMapping("/eviction/polls/{pollId}/reset-votes")
    public ResponseEntity<ApiResponse<EvictionPollDto>> resetVotes(@PathVariable Long pollId) {
        try {
            return ResponseEntity.ok(ApiResponse.ok(evictionPollService.resetVotes(pollId)));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/eviction/polls/season/{seasonId}")
    public ResponseEntity<ApiResponse<List<EvictionPollDto>>> getPollsForSeason(@PathVariable Long seasonId) {
        return ResponseEntity.ok(ApiResponse.ok(evictionPollService.getAllPollsForSeason(seasonId)));
    }

    // ── Nomination sync ───────────────────────────────────────────────────────

    @GetMapping("/nomination-sync/status")
    public ResponseEntity<ApiResponse<NominationSyncService.SyncStatusDto>> getSyncStatus() {
        return ResponseEntity.ok(ApiResponse.ok(nominationSyncService.getStatus()));
    }

    @PostMapping("/nomination-sync/trigger")
    public ResponseEntity<ApiResponse<NominationSyncService.SyncResult>> triggerSync(
            @RequestParam(required = false) String show,
            @RequestParam(defaultValue = "false") boolean force) {
        NominationSyncService.SyncResult result = nominationSyncService.runSync(show, force);
        return ResponseEntity.ok(result.errors().isEmpty()
            ? ApiResponse.ok(result)
            : ApiResponse.error("Sync completed with errors.", result));
    }

    @GetMapping("/nomination-sync/dry-run")
    public ResponseEntity<ApiResponse<NominationSyncService.DryRunResult>> dryRun(
            @RequestParam String show) {
        NominationSyncService.DryRunResult result = nominationSyncService.dryRun(show);
        return ResponseEntity.ok(result.success()
            ? ApiResponse.ok(result)
            : ApiResponse.error("Dry-run failed: " + result.error(), result));
    }
}
