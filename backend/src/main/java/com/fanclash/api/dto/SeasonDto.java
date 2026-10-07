package com.fanclash.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record SeasonDto(
        Long id,
        Long showId,
        String showName,
        String showSlug,
        String name,
        Integer seasonNumber,
        String status,
        String description,
        String heroImage,
        LocalDate startDate,
        LocalDate endDate,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
