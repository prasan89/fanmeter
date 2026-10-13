package com.fanclash.api.entity;

import java.io.Serializable;
import java.util.Objects;

public class ContestantFavouriteCountId implements Serializable {
    private Long seasonId;
    private Long contestantId;

    public ContestantFavouriteCountId() {}
    public ContestantFavouriteCountId(Long seasonId, Long contestantId) {
        this.seasonId     = seasonId;
        this.contestantId = contestantId;
    }

    @Override public boolean equals(Object o) {
        if (!(o instanceof ContestantFavouriteCountId c)) return false;
        return Objects.equals(seasonId, c.seasonId) && Objects.equals(contestantId, c.contestantId);
    }
    @Override public int hashCode() { return Objects.hash(seasonId, contestantId); }
}
