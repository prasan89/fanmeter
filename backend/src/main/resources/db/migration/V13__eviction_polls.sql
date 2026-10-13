-- V13: Eviction poll feature — This Week's Eviction
-- Separate from voting_rounds/fan_votes to keep eviction-specific lifecycle,
-- source tracking, and audit trail self-contained.

-- ── Eviction polls ────────────────────────────────────────────────────────────
-- One row per season per week. Lifecycle: draft → open → closed → archived.

CREATE TABLE eviction_polls (
    id              BIGSERIAL PRIMARY KEY,
    season_id       BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    week_number     INT    NOT NULL,
    week_label      VARCHAR(80),                    -- e.g. "Week 7 (Oct 21–27)"
    vote_mode       VARCHAR(10) NOT NULL DEFAULT 'save'
                    CHECK (vote_mode IN ('save', 'evict')),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'open', 'closed', 'archived')),
    opens_at        TIMESTAMP,
    closes_at       TIMESTAMP,
    source_verified BOOLEAN NOT NULL DEFAULT false,
    admin_notes     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (season_id, week_number),
    CHECK (closes_at IS NULL OR opens_at IS NULL OR closes_at > opens_at)
);
CREATE INDEX idx_eviction_polls_season_status ON eviction_polls(season_id, status);
CREATE INDEX idx_eviction_polls_status_closes ON eviction_polls(status, closes_at);

-- ── Eviction nominees ────────────────────────────────────────────────────────
-- Nominated contestants per poll.

CREATE TABLE eviction_nominees (
    id            BIGSERIAL PRIMARY KEY,
    poll_id       BIGINT NOT NULL REFERENCES eviction_polls(id) ON DELETE CASCADE,
    contestant_id BIGINT NOT NULL REFERENCES contestants(id),
    confirmed     BOOLEAN NOT NULL DEFAULT false,   -- true = at least 2 sources agree
    added_by      VARCHAR(20) NOT NULL DEFAULT 'auto'
                  CHECK (added_by IN ('auto', 'admin')),
    admin_notes   TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (poll_id, contestant_id)
);
CREATE INDEX idx_eviction_nominees_poll ON eviction_nominees(poll_id);

-- ── Nomination sources ───────────────────────────────────────────────────────
-- Evidence trail for each nomination discovery run.

CREATE TABLE nomination_sources (
    id            BIGSERIAL PRIMARY KEY,
    poll_id       BIGINT NOT NULL REFERENCES eviction_polls(id) ON DELETE CASCADE,
    publication   VARCHAR(100) NOT NULL,            -- 'Wikipedia', 'India Today', etc.
    url           VARCHAR(500) NOT NULL,
    retrieved_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status        VARCHAR(20) NOT NULL DEFAULT 'unverified'
                  CHECK (status IN ('confirmed', 'conflicting', 'unverified', 'failed')),
    raw_names     TEXT,                             -- JSON-serialised string array of extracted names
    notes         TEXT
);
CREATE INDEX idx_nomination_sources_poll ON nomination_sources(poll_id);

-- ── Eviction votes ───────────────────────────────────────────────────────────
-- One vote per (poll, contestant, voter device). Append-only.

CREATE TABLE eviction_votes (
    id            BIGSERIAL PRIMARY KEY,
    poll_id       BIGINT NOT NULL REFERENCES eviction_polls(id) ON DELETE CASCADE,
    contestant_id BIGINT NOT NULL REFERENCES contestants(id),
    voter_key     VARCHAR(128) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (poll_id, contestant_id, voter_key)
);
CREATE INDEX idx_eviction_votes_poll_contestant ON eviction_votes(poll_id, contestant_id);
CREATE INDEX idx_eviction_votes_voter ON eviction_votes(voter_key, poll_id, created_at DESC);

-- ── Nomination sync logs ─────────────────────────────────────────────────────
-- Separate from contestant_sync_logs; tracks nomination discovery runs.

CREATE TABLE nomination_sync_logs (
    id                BIGSERIAL PRIMARY KEY,
    show_slug         VARCHAR(100),
    started_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at       TIMESTAMP,
    status            VARCHAR(20) NOT NULL DEFAULT 'running'
                      CHECK (status IN ('running', 'success', 'failed', 'partial')),
    sources_checked   INT NOT NULL DEFAULT 0,
    nominees_found    INT NOT NULL DEFAULT 0,
    conflicts_found   INT NOT NULL DEFAULT 0,
    error_detail      TEXT
);
CREATE INDEX idx_nomination_sync_logs_started ON nomination_sync_logs(started_at DESC);
