package com.fanclash.api.dto;

import java.time.LocalDateTime;

public record ShowDto(
        Long id,
        String name,
        String slug,
        String category,
        String description,
        String status,
        String imageUrl,
        String language,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
