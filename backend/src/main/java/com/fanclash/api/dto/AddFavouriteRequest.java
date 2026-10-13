package com.fanclash.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AddFavouriteRequest(
    @NotNull  Long   contestantId,
    @NotBlank @Size(min = 8, max = 128) String voterKey,
    /** Client-generated UUID for this logical click. Retrying with same key is safe. */
    @NotBlank @Size(min = 8, max = 128) String idempotencyKey
) {}
