package com.fanclash.api.dto;

import java.time.LocalDateTime;

public record ContestantDto(
        Long id,
        Long seasonId,
        String name,
        String slug,
        String profileImage,
        String bio,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
