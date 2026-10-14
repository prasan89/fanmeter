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
    /** One of: NOMINATIONS_PUBLISHED, NEEDS_VERIFICATION, SOURCE_UNAVAILABLE,
     *  NO_NOMINATIONS_CONFIRMED, POLL_OPEN, VOTING_CLOSED */
    String nominationState,
    List<EvictionNomineeDto> nominees,
    String updatedAt,
    String sourceAttribution
) {}
