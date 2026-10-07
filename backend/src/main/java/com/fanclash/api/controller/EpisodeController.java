package com.fanclash.api.controller;

import com.fanclash.api.dto.ApiResponse;
import com.fanclash.api.dto.EpisodeDto;
import com.fanclash.api.service.ShowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/episodes")
@RequiredArgsConstructor
public class EpisodeController {

    private final ShowService showService;

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EpisodeDto>> getEpisodeById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(showService.getEpisodeById(id)));
    }
}
