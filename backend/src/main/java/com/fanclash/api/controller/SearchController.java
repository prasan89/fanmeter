package com.fanclash.api.controller;

import com.fanclash.api.dto.ApiResponse;
import com.fanclash.api.dto.SearchResultDto;
import com.fanclash.api.service.ShowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final ShowService showService;

    @GetMapping
    public ResponseEntity<ApiResponse<SearchResultDto>> search(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(ApiResponse.ok(showService.search(q)));
    }
}
