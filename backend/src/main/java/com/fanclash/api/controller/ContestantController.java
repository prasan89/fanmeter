package com.fanclash.api.controller;

import com.fanclash.api.dto.ApiResponse;
import com.fanclash.api.dto.ContestantDto;
import com.fanclash.api.service.ShowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contestants")
@RequiredArgsConstructor
public class ContestantController {

    private final ShowService showService;

    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<ContestantDto>> getContestantBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(showService.getContestantBySlug(slug)));
    }
}
