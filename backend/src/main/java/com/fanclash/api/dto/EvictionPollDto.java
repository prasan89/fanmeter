package com.fanclash.api.dto;

import java.util.List;

public record EvictionPollDto(
    Long   id,
    Long   seasonId,
    String seasonName,
    String showSlug,
    int    weekNumber,
    String weekLabel,
    String voteMode,
    String status,
    String opensAt,
    String closesAt,
    boolean sourceVerified,
    List<EvictionNomineeDto> nominees,
    String updatedAt
) {}
