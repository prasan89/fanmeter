package com.fanclash.api.dto;

/** Result of a favourite toggle. */
public record ToggleFavouriteResponse(
    boolean success,
    String  message,
    boolean favourited,       // true = now favourited, false = now unfavourited
    Long    contestantId,
    long    newFavouriteCount
) {}
