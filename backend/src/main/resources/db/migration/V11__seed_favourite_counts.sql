-- V11: Pre-seed contestant_favourite_counts rows for all existing contestants.
-- This ensures atomicIncrement (UPDATE) always finds an existing row,
-- eliminating the INSERT race condition under concurrent load.
INSERT INTO contestant_favourite_counts (season_id, contestant_id, total, updated_at)
SELECT season_id, id, 0, CURRENT_TIMESTAMP
FROM contestants
WHERE NOT EXISTS (
    SELECT 1 FROM contestant_favourite_counts cfc
    WHERE cfc.season_id = contestants.season_id
      AND cfc.contestant_id = contestants.id
);
