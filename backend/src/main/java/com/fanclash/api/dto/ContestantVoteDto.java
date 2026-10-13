package com.fanclash.api.dto;

public record ContestantVoteDto(
    Long contestantId,
    String contestantName,
    String contestantSlug,
    String profileImage,
    String status,
    long voteCount,
    int rank
) {}
