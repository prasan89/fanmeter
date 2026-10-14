-- Performance indexes for high-traffic queries.
-- nomination_sources: retrieved_at DESC is used by findTopByPollIdOrderByRetrievedAtDesc
--   and by the batch findLatestByPollIds query.
CREATE INDEX IF NOT EXISTS idx_nomination_sources_poll_retrieved
    ON nomination_sources(poll_id, retrieved_at DESC);

-- contestants: composite (season_id, status) supports the active-contestant lookup
--   used by sync (findBySeasonIdOrderByNameAsc) and rankings.
CREATE INDEX IF NOT EXISTS idx_contestants_season_status
    ON contestants(season_id, status);

-- contestant_favourite_counts: (season_id, contestant_id) is the primary lookup
--   for atomicIncrement and getRankings — ensure it exists.
CREATE INDEX IF NOT EXISTS idx_cfc_season_contestant
    ON contestant_favourite_counts(season_id, contestant_id);
