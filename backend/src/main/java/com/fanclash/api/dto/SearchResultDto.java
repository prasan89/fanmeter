package com.fanclash.api.dto;

import java.util.List;

public record SearchResultDto(
        List<ShowDto> shows,
        List<ContestantDto> contestants,
        int total
) {}
