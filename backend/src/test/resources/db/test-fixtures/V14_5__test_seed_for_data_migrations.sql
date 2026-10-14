-- Test-only seed data so V15/V16/V17 data migrations run without FK violations in H2.
-- Inserts are intentionally without explicit IDs to avoid H2 sequence collisions.
-- The NOT EXISTS guards in V15/V16/V17 will skip re-inserting rows that already exist by slug.

-- Seed contestants for Tamil season 10 (referenced by V15 and V17)
-- These will be inserted by V15 itself via its NOT EXISTS guard.
-- What we actually need here is just the eviction_polls row for V16/V17.

-- Seed eviction_polls row id=4 for Tamil week 6 (referenced by V16/V17 by hardcoded id=4)
-- Only insert if V14 or earlier didn't already create it.
INSERT INTO eviction_polls (id, season_id, week_number, week_label, vote_mode, status, source_verified, nomination_state, created_at, updated_at)
SELECT 4, s.id, 6, 'Week 6', 'save', 'open', TRUE, 'NOMINATIONS_PUBLISHED', NOW(), NOW()
FROM seasons s JOIN shows sh ON s.show_id = sh.id
WHERE sh.slug = 'bigg-boss-tamil' AND s.season_number = 10
AND NOT EXISTS (SELECT 1 FROM eviction_polls WHERE id = 4);
