-- V23: Backfill baseline_count for any contestants missing from contestant_favourite_counts.
-- These are contestants added after V11/V12/V19 seeding (e.g. late-added nominees).
-- Insert missing rows with total=0 and a seeded baseline in [5000, 8000].
INSERT INTO contestant_favourite_counts (season_id, contestant_id, total, baseline_count, updated_at)
SELECT c.season_id, c.id, 0, FLOOR(5000 + RANDOM() * 3001), CURRENT_TIMESTAMP
FROM contestants c
WHERE NOT EXISTS (
    SELECT 1 FROM contestant_favourite_counts cfc
    WHERE cfc.season_id = c.season_id AND cfc.contestant_id = c.id
);
