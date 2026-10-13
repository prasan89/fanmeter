package com.fanclash.api.dto;

public record CastEvictionVoteResponse(
    boolean success,
    String  message,
    long    newVoteCount,
    Long    contestantId
) {}
