package com.fanclash.api.controller;

import com.fanclash.api.dto.*;
import com.fanclash.api.service.ShowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seasons")
@RequiredArgsConstructor
public class SeasonController {

    private final ShowService showService;

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SeasonDto>> getSeasonById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(showService.getSeasonById(id)));
    }

    @GetMapping("/{id}/contestants")
    public ResponseEntity<ApiResponse<List<ContestantDto>>> getContestants(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(showService.getContestantsBySeasonId(id)));
    }

    @GetMapping("/{id}/episodes")
    public ResponseEntity<ApiResponse<List<EpisodeDto>>> getEpisodes(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(showService.getEpisodesBySeasonId(id)));
    }
}
