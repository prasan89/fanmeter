package com.fanclash.api.controller;

import com.fanclash.api.dto.*;
import com.fanclash.api.service.FavouriteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.TimeUnit;

@RestController
@RequiredArgsConstructor
public class FavouriteController {

    private final FavouriteService favouriteService;

    /**
     * GET /api/seasons/{seasonId}/rankings?voterKey=fmk_...
     * Returns contestant list ordered by favourite count DESC.
     */
    @GetMapping("/api/seasons/{seasonId}/rankings")
    public ResponseEntity<ApiResponse<RankingsDto>> getRankings(
            @PathVariable Long seasonId,
            @RequestParam(required = false) String voterKey) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(2, TimeUnit.SECONDS).sMaxAge(2, TimeUnit.SECONDS))
                .body(ApiResponse.ok(favouriteService.getRankings(seasonId, voterKey)));
    }

    /**
     * POST /api/seasons/{seasonId}/favourites
     * Append-only: every accepted request increments the count by exactly 1.
     * Idempotency: repeat POST with same idempotencyKey returns current count without re-counting.
     */
    @PostMapping("/api/seasons/{seasonId}/favourites")
    public ResponseEntity<ApiResponse<AddFavouriteResponse>> addFavourite(
            @PathVariable Long seasonId,
            @Valid @RequestBody AddFavouriteRequest req) {
        AddFavouriteResponse result = favouriteService.addFavourite(seasonId, req);
        return ResponseEntity.ok(result.success()
            ? ApiResponse.ok(result)
            : ApiResponse.error(result.message(), result));
    }
}
