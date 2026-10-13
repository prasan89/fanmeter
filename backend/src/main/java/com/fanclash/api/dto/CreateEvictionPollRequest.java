package com.fanclash.api.dto;

import java.util.List;

public record CreateEvictionPollRequest(
    Long    seasonId,
    Integer weekNumber,
    String  weekLabel,
    String  voteMode,
    String  opensAt,
    String  closesAt
) {}
