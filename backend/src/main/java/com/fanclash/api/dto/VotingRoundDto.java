package com.fanclash.api.dto;

import java.time.LocalDateTime;
import java.util.List;

public record VotingRoundDto(
    Long id,
    Long seasonId,
    String seasonName,
    String showSlug,
    String title,
    String status,
    LocalDateTime opensAt,
    LocalDateTime closesAt,
    LocalDateTime createdAt,
    List<ContestantVoteDto> results
) {}
