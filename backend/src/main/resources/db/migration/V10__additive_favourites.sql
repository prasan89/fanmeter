-- V10: Switch contestant_favourites to additive append-only model.
-- Every heart click is a new row identified by a client-supplied idempotency_key.
-- Retrying the same logical click reuses the same idempotency_key → UNIQUE prevents double-count.
-- A new intentional click uses a new idempotency_key → new row is always accepted.
--
-- We also maintain a contestant_favourite_counts summary table for O(1) leaderboard reads.
-- It is updated via an atomic INSERT … ON CONFLICT DO UPDATE in the application layer
-- (no trigger dependency needed for portability).

-- 1. Drop the old per-voter uniqueness constraint (season+contestant+voter no longer unique).
ALTER TABLE contestant_favourites
    DROP CONSTRAINT IF EXISTS uq_contestant_favourites;

-- 2. Add idempotency_key column and make it the unique constraint instead.
ALTER TABLE contestant_favourites
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

-- Back-fill existing rows so NOT NULL can be enforced.
UPDATE contestant_favourites SET idempotency_key = CONCAT('legacy_', id) WHERE idempotency_key IS NULL;

ALTER TABLE contestant_favourites
    ALTER COLUMN idempotency_key SET NOT NULL;

ALTER TABLE contestant_favourites
    ADD CONSTRAINT uq_cf_idempotency_key UNIQUE (idempotency_key);

-- 3. Keep the fast leaderboard index on season + contestant.
-- idx_cf_season_contestant already exists from V9; no-op if so.

-- 4. Summary/aggregate table: one row per (season_id, contestant_id), count updated atomically.
CREATE TABLE IF NOT EXISTS contestant_favourite_counts (
    season_id      BIGINT NOT NULL REFERENCES seasons(id)     ON DELETE CASCADE,
    contestant_id  BIGINT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
    total          BIGINT NOT NULL DEFAULT 0,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (season_id, contestant_id)
);

-- Seed from existing rows. Uses INSERT … SELECT into a staging insert; each group row
-- is handled via an explicit merge so this works in both H2 and PostgreSQL.
-- In practice contestant_favourites was just created in V9 and will be empty,
-- but this guards against any hand-loaded data.
INSERT INTO contestant_favourite_counts (season_id, contestant_id, total, updated_at)
SELECT season_id, contestant_id, COUNT(*), CURRENT_TIMESTAMP
FROM contestant_favourites
GROUP BY season_id, contestant_id;
