package com.fanclash.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CastVoteRequest(
    @NotNull Long votingRoundId,
    @NotNull Long contestantId,
    @NotBlank @Size(min = 8, max = 128) String voterKey
) {}
