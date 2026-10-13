package com.fanclash.api.dto;

public record CastEvictionVoteRequest(
    Long   pollId,
    Long   contestantId,
    String voterKey
) {}
