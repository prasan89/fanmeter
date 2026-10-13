package com.fanclash.api.dto;

import java.util.List;

public record EvictionNomineeDto(
    Long   contestantId,
    String contestantName,
    String contestantSlug,
    String profileImage,
    long   voteCount,
    double voteShare,
    int    rank
) {}
