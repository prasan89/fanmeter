package com.fanclash.api.dto;

public record CastVoteResponse(
    boolean success,
    String message,
    Long voteId,
    Long contestantId,
    long newTotalVotes
) {}
