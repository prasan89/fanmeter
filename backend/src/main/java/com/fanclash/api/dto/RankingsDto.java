package com.fanclash.api.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/** Full rankings response for an event page. */
public record RankingsDto(
    Long                       seasonId,
    String                     seasonName,
    String                     showSlug,
    List<ContestantRankingDto> rankings,
    Set<Long>                  myFavourites,   // contestant IDs favourited by the requesting voter
    LocalDateTime              updatedAt
) {}
