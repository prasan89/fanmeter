package com.fanclash.api.sentiment.controller;

import com.fanclash.api.config.AdminAuthInterceptor;
import com.fanclash.api.sentiment.entity.SentimentIngestionRun;
import com.fanclash.api.sentiment.repository.SentimentIngestionRunRepository;
import com.fanclash.api.sentiment.repository.SentimentReviewItemRepository;
import com.fanclash.api.sentiment.service.SentimentCalculationService;
import com.fanclash.api.sentiment.service.SentimentIngestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin-only endpoints for sentiment ingestion and score computation.
 *
 * All requests require X-Admin-Secret header (checked by AdminAuthInterceptor).
 *
 * POST /api/admin/sentiment/ingest?source=X&show=Y  — run ingestion for one or all shows
 * POST /api/admin/sentiment/compute?show=X           — (re)compute scores for a show
 * GET  /api/admin/sentiment/status                   — last 20 ingestion runs
 * GET  /api/admin/sentiment/review-queue             — unresolved contestant names
 */
@RestController
@RequestMapping("/api/admin/sentiment")
@RequiredArgsConstructor
public class SentimentAdminController {

    private final SentimentIngestionService ingestionService;
    private final SentimentCalculationService calculationService;
    private final SentimentIngestionRunRepository runRepository;
    private final SentimentReviewItemRepository reviewItemRepository;

    @PostMapping("/ingest")
    public ResponseEntity<SentimentIngestionService.IngestionResult> triggerIngestion(
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String show) {
        SentimentIngestionService.IngestionResult result = ingestionService.runIngestion(source, show);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/compute")
    public ResponseEntity<SentimentCalculationService.ComputeResult> triggerCompute(
            @RequestParam(required = false) String show,
            @RequestParam(required = false) String period) {
        if (show != null) {
            return ResponseEntity.ok(calculationService.computeScores(show, period));
        }
        List<SentimentCalculationService.ComputeResult> results = calculationService.computeAllShows();
        long failed = results.stream().filter(r -> r.error() != null).count();
        return ResponseEntity.ok(new SentimentCalculationService.ComputeResult(
            "all", period, results.stream().mapToInt(SentimentCalculationService.ComputeResult::snapshotsSaved).sum(),
            failed > 0 ? failed + " show(s) failed" : null
        ));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        List<SentimentIngestionRun> recent = runRepository.findTop20ByOrderByStartedAtDesc();
        return ResponseEntity.ok(Map.of("recentRuns", recent));
    }

    @GetMapping("/review-queue")
    public ResponseEntity<Map<String, Object>> getReviewQueue(
            @RequestParam(defaultValue = "pending") String status) {
        return ResponseEntity.ok(Map.of(
            "items", reviewItemRepository.findByStatusOrderByCreatedAtDesc(status)
        ));
    }
}
