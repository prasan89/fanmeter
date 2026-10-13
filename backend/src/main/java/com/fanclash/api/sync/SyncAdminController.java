package com.fanclash.api.sync;

import com.fanclash.api.dto.ApiResponse;
import com.fanclash.api.entity.ContestantSyncLog;
import com.fanclash.api.repository.ContestantSyncLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Admin-only endpoints for Wikipedia sync status and manual trigger.
 *
 * In a production deployment these should be protected by an admin API key or
 * internal network access.  For now they are accessible under /api/admin/sync.
 */
@RestController
@RequestMapping("/api/admin/sync")
@RequiredArgsConstructor
public class SyncAdminController {

    private final WikipediaContestantSyncService syncService;
    private final ContestantSyncLogRepository syncLogRepository;

    /** GET /api/admin/sync/status — last run, next scheduled, recent logs */
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<SyncStatusDto>> getStatus() {
        List<ContestantSyncLog> recent = syncLogRepository.findTop10ByOrderByStartedAtDesc();
        ContestantSyncLog last = recent.isEmpty() ? null : recent.get(0);

        // Next scheduled: next 00:30 UTC (6:00 AM IST)
        LocalDateTime nextRun = nextScheduledRun();

        SyncStatusDto dto = new SyncStatusDto(
            last != null ? last.getStartedAt() : null,
            last != null ? last.getFinishedAt() : null,
            last != null ? last.getStatus() : "never run",
            last != null ? last.getUpdatedCount() : 0,
            last != null ? last.getFlaggedCount() : 0,
            last != null ? last.getErrorDetail() : null,
            nextRun,
            recent
        );
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    /** POST /api/admin/sync/trigger?show={slug} — manual trigger */
    @PostMapping("/trigger")
    public ResponseEntity<ApiResponse<WikipediaContestantSyncService.SyncResult>> trigger(
        @RequestParam(required = false) String show
    ) {
        WikipediaContestantSyncService.SyncResult result = syncService.runSync(show);
        return ResponseEntity.ok(
            result.errors().isEmpty()
                ? ApiResponse.ok("Sync completed", result)
                : ApiResponse.error("Sync completed with errors", result)
        );
    }

    private LocalDateTime nextScheduledRun() {
        LocalDateTime now = LocalDateTime.now(java.time.ZoneOffset.UTC);
        LocalDateTime candidate = now.toLocalDate().atTime(0, 30);
        if (!now.isBefore(candidate)) candidate = candidate.plusDays(1);
        return candidate;
    }

    public record SyncStatusDto(
        LocalDateTime lastStartedAt,
        LocalDateTime lastFinishedAt,
        String lastStatus,
        int lastUpdatedCount,
        int lastFlaggedCount,
        String lastErrorDetail,
        LocalDateTime nextScheduledAt,
        List<ContestantSyncLog> recentLogs
    ) {}
}
