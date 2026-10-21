package com.fanclash.api.chat.controller;

import com.fanclash.api.chat.dto.ReportMessageRequest;
import com.fanclash.api.chat.entity.ChatModQueueItem;
import com.fanclash.api.chat.entity.ChatReport;
import com.fanclash.api.chat.entity.ChatRestriction;
import com.fanclash.api.chat.moderation.ViolationCategory;
import com.fanclash.api.chat.repository.ChatModQueueRepository;
import com.fanclash.api.chat.repository.ChatReportRepository;
import com.fanclash.api.chat.repository.ChatRestrictionRepository;
import com.fanclash.api.chat.service.ChatService;
import com.fanclash.api.chat.service.RestrictionService;
import com.fanclash.api.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Moderator dashboard API. All routes under /api/admin/** are protected by
 * AdminAuthInterceptor (X-Admin-Secret header). Never trust caller-supplied role claims.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/chat")
public class ChatAdminController {

    private final ChatService            chatService;
    private final RestrictionService     restrictionService;
    private final ChatModQueueRepository modQueueRepo;
    private final ChatReportRepository   reportRepo;
    private final ChatRestrictionRepository restrictionRepo;

    // ── Existing endpoints (preserved) ───────────────────────────────────────

    public record DeleteMessageRequest(String reason) {}

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<ApiResponse<Void>> deleteMessage(
            @PathVariable Long messageId,
            @RequestBody(required = false) DeleteMessageRequest req) {
        chatService.deleteMessage(messageId, "admin", req != null ? req.reason() : null);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── Moderation queue ──────────────────────────────────────────────────────

    @GetMapping("/queue")
    public ResponseEntity<ApiResponse<List<ChatModQueueItem>>> getQueue(
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(ApiResponse.ok(
                modQueueRepo.findPending(PageRequest.of(0, Math.min(limit, 200)))));
    }

    public record ResolveQueueRequest(String resolution, String resolver, String notes) {}

    @PostMapping("/queue/{id}/resolve")
    public ResponseEntity<ApiResponse<Void>> resolveQueueItem(
            @PathVariable Long id,
            @RequestBody ResolveQueueRequest req) {
        modQueueRepo.findById(id).ifPresent(item -> {
            item.setStatus(ChatModQueueItem.Status.RESOLVED);
            item.setResolution(req.resolution());
            item.setResolver(req.resolver());
            item.setNotes(req.notes());
            item.setResolvedAt(Instant.now());
            modQueueRepo.save(item);
        });
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── Reports ───────────────────────────────────────────────────────────────

    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<List<ChatReport>>> getPendingReports(
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(ApiResponse.ok(
                reportRepo.findPendingReports(PageRequest.of(0, Math.min(limit, 200)))));
    }

    public record ResolveReportRequest(String reviewer, String outcome) {}

    @PostMapping("/reports/{id}/resolve")
    public ResponseEntity<ApiResponse<Void>> resolveReport(
            @PathVariable Long id,
            @RequestBody ResolveReportRequest req) {
        reportRepo.findById(id).ifPresent(report -> {
            report.setReviewedAt(Instant.now());
            report.setReviewer(req.reviewer());
            report.setOutcome(req.outcome());
            reportRepo.save(report);
        });
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── User history and actions ──────────────────────────────────────────────

    @GetMapping("/users/{token}/history")
    public ResponseEntity<ApiResponse<UserHistory>> getUserHistory(@PathVariable String token) {
        List<ChatRestriction> restrictions = restrictionRepo.findAllByToken(token);
        List<ChatReport> reports = reportRepo.findByReportedToken(token);
        return ResponseEntity.ok(ApiResponse.ok(new UserHistory(token, restrictions, reports)));
    }

    public record UserHistory(String token, List<ChatRestriction> restrictions, List<ChatReport> reportsAgainst) {}

    // ── Restriction management ────────────────────────────────────────────────

    @GetMapping("/restrictions")
    public ResponseEntity<ApiResponse<List<ChatRestriction>>> listRestrictions(
            @RequestParam(required = false) String token) {
        List<ChatRestriction> result = token != null
                ? restrictionRepo.findAllByToken(token)
                : restrictionRepo.findAll();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    public record ModActionRequest(
            String targetToken,
            String roomId,
            String action,           // WARN, TIMEOUT, BAN, UNBAN
            Integer durationMinutes, // for TIMEOUT
            String category,
            String reason
    ) {}

    @PostMapping("/actions")
    public ResponseEntity<ApiResponse<Void>> performAction(@RequestBody ModActionRequest req) {
        String issuer = "admin";
        ViolationCategory cat = req.category() != null
                ? ViolationCategory.valueOf(req.category())
                : ViolationCategory.OTHER;

        switch (req.action().toUpperCase()) {
            case "WARN" -> restrictionService.issueModeratorAction(
                    req.targetToken(), req.roomId(),
                    ChatRestriction.RestrictionType.WARNING, cat, null, issuer);
            case "TIMEOUT" -> restrictionService.issueModeratorAction(
                    req.targetToken(), req.roomId(),
                    ChatRestriction.RestrictionType.TIMEOUT, cat,
                    req.durationMinutes() != null ? req.durationMinutes() : 60, issuer);
            case "BAN" -> restrictionService.issueModeratorAction(
                    req.targetToken(), req.roomId(),
                    ChatRestriction.RestrictionType.PERMANENT_BAN, cat, null, issuer);
            case "UNBAN" -> {
                // Revoke all active restrictions for this token in this room
                restrictionRepo.findAllByToken(req.targetToken()).stream()
                        .filter(ChatRestriction::isActive)
                        .forEach(r -> restrictionService.revokeRestriction(r.getId(), issuer));
            }
            default -> throw new IllegalArgumentException("Unknown action: " + req.action());
        }
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/restrictions/{id}/revoke")
    public ResponseEntity<ApiResponse<Void>> revokeRestriction(@PathVariable Long id) {
        restrictionService.revokeRestriction(id, "admin");
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── Appeals ───────────────────────────────────────────────────────────────

    @GetMapping("/appeals")
    public ResponseEntity<ApiResponse<List<ChatRestriction>>> getPendingAppeals() {
        return ResponseEntity.ok(ApiResponse.ok(
                restrictionRepo.findByAppealStatus(ChatRestriction.AppealStatus.PENDING)));
    }

    public record ResolveAppealRequest(boolean approved, String note) {}

    @PostMapping("/appeals/{id}/resolve")
    public ResponseEntity<ApiResponse<Void>> resolveAppeal(
            @PathVariable Long id,
            @RequestBody ResolveAppealRequest req) {
        restrictionService.resolveAppeal(id, req.approved(), "admin", req.note());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
