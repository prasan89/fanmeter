-- V26: External vote injection infrastructure
-- Adds delta ledger for tracking external vote counts per source/show/contestant
-- and a boost column on eviction_nominees so external counts surface in the Eviction tab.

-- ── Delta ledger ──────────────────────────────────────────────────────────────
-- One row per (source, show, contestant). Stores the last raw_count we applied
-- so subsequent runs only add the increment (preventing double-counting).
CREATE TABLE external_vote_ledger (
    id              BIGSERIAL PRIMARY KEY,
    source_key      VARCHAR(64)  NOT NULL,
    show_slug       VARCHAR(64)  NOT NULL,
    contestant_id   BIGINT       NOT NULL REFERENCES contestants(id),
    last_raw_count  BIGINT       NOT NULL DEFAULT 0,
    last_applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (source_key, show_slug, contestant_id)
);

CREATE INDEX external_vote_ledger_lookup ON external_vote_ledger(source_key, show_slug, contestant_id);

-- ── Eviction nominee boost ────────────────────────────────────────────────────
-- External vote counts are added here rather than as fake eviction_votes rows,
-- preserving the integrity of the per-voter ledger.
ALTER TABLE eviction_nominees
    ADD COLUMN external_vote_boost BIGINT NOT NULL DEFAULT 0;
