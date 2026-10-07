package com.fanclash.api.controller;

import com.fanclash.api.dto.*;
import com.fanclash.api.service.ShowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shows")
@RequiredArgsConstructor
public class ShowController {

    private final ShowService showService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ShowDto>>> getAllShows(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String status) {
        if (category != null || language != null || status != null) {
            return ResponseEntity.ok(ApiResponse.ok(showService.getShowsByFilters(category, language, status)));
        }
        return ResponseEntity.ok(ApiResponse.ok(showService.getAllShows()));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<ShowDto>> getShowBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(showService.getShowBySlug(slug)));
    }

    @GetMapping("/{slug}/seasons")
    public ResponseEntity<ApiResponse<List<SeasonDto>>> getSeasonsByShow(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(showService.getSeasonsByShowSlug(slug)));
    }
}
