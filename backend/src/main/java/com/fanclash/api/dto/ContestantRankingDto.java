package com.fanclash.api.dto;

import java.util.List;

/** Ranking entry for a single contestant in the favourites leaderboard. */
public record ContestantRankingDto(
    Long   contestantId,
    String contestantName,
    String contestantSlug,
    String profileImage,
    String status,
    long   favouriteCount,
    int    rank,
    double voteShare
) {}
