package com.fanclash.api.dto;

import java.util.List;

public record SetNomineesRequest(
    List<Long> contestantIds,
    String     addedBy,
    String     adminNotes
) {}
