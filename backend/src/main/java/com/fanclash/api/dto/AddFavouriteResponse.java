package com.fanclash.api.dto;

public record AddFavouriteResponse(
    boolean success,
    String  message,
    boolean duplicate,          // true when idempotencyKey was already seen (safe retry)
    Long    contestantId,
    long    newFavouriteCount   // current aggregate total
) {}
