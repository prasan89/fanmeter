package com.fanclash.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record EpisodeDto(
        Long id,
        Long seasonId,
        Integer episodeNumber,
        String title,
        String description,
        String thumbnail,
        Integer durationMinutes,
        LocalDate airDate,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
