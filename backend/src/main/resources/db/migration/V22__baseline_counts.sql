-- Add baseline_count column: per-contestant popularity seed set once at initialization.
-- baseline_count: fixed seed in [5000, 8000], never touched by heart clicks.
-- total: real FanMeter heart clicks only (incremented by atomicIncrement).
-- Displayed fan score = baseline_count + total.

ALTER TABLE contestant_favourite_counts
    ADD COLUMN IF NOT EXISTS baseline_count BIGINT NOT NULL DEFAULT 0;

-- Seed every row that still has baseline_count = 0 with a random value in [5000, 8000].
-- RANDOM() is available on both PostgreSQL and H2 (PostgreSQL-compat mode).
-- The WHERE baseline_count = 0 guard makes this idempotent.
UPDATE contestant_favourite_counts
SET baseline_count = FLOOR(5000 + RANDOM() * 3001)
WHERE baseline_count = 0;
