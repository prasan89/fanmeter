-- V9: Contestant favourites (heart button)
-- One favourite per (season_id, contestant_id, voter_key).
-- Toggling by deleting allows unfavourite.
-- Rate abuse prevention: max_favourites_per_voter_per_hour handled in service.

CREATE TABLE contestant_favourites (
    id          BIGSERIAL   PRIMARY KEY,
    season_id   BIGINT      NOT NULL REFERENCES seasons(id)     ON DELETE CASCADE,
    contestant_id BIGINT    NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
    voter_key   VARCHAR(128) NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_contestant_favourites UNIQUE (season_id, contestant_id, voter_key)
);

-- Fast leaderboard query: GROUP BY contestant_id WHERE season_id = ?
CREATE INDEX idx_cf_season_contestant ON contestant_favourites(season_id, contestant_id);
-- Rate-limit window lookup
CREATE INDEX idx_cf_voter_season_created ON contestant_favourites(voter_key, season_id, created_at DESC);
