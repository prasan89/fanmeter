-- V24: External Fan Sentiment Aggregation tables
-- Stores third-party poll signals separately from FanMeter votes.
-- CRITICAL: sentiment_observations.raw_count is NEVER added to fan_votes or contestant_favourite_counts.

-- ── Source registry ───────────────────────────────────────────────────────────
-- One row per approved external source (HousePulse, TamilGlitz, etc.)
CREATE TABLE sentiment_sources (
    id          BIGSERIAL PRIMARY KEY,
    source_key  VARCHAR(64)  NOT NULL UNIQUE,  -- e.g. "housepulse", "tamilglitz"
    display_name VARCHAR(120) NOT NULL,
    base_url    TEXT         NOT NULL,
    adapter_class VARCHAR(200) NOT NULL,        -- FQCN of the adapter implementation
    weight      NUMERIC(4,2) NOT NULL DEFAULT 1.0, -- cross-source weight for combined score
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    robots_compliant BOOLEAN NOT NULL DEFAULT TRUE,
    notes       TEXT,
    created_at  TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW()
);

-- ── Ingestion run log ─────────────────────────────────────────────────────────
-- One row per scheduled ingestion run across all sources.
CREATE TABLE sentiment_ingestion_runs (
    id          BIGSERIAL PRIMARY KEY,
    source_id   BIGINT       NOT NULL REFERENCES sentiment_sources(id),
    show_slug   VARCHAR(64)  NOT NULL,
    started_at  TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE,
    status      VARCHAR(32)  NOT NULL DEFAULT 'running', -- running|success|partial|failed
    observations_written INT NOT NULL DEFAULT 0,
    error_detail TEXT,
    http_status INT,
    raw_url     TEXT
);
CREATE INDEX sentiment_ingestion_runs_source_show ON sentiment_ingestion_runs(source_id, show_slug);
CREATE INDEX sentiment_ingestion_runs_started ON sentiment_ingestion_runs(started_at DESC);

-- ── External poll snapshots ───────────────────────────────────────────────────
-- One row per (source, show, period). A "period" is typically one poll week.
CREATE TABLE sentiment_polls (
    id          BIGSERIAL PRIMARY KEY,
    source_id   BIGINT       NOT NULL REFERENCES sentiment_sources(id),
    show_slug   VARCHAR(64)  NOT NULL,
    period_label VARCHAR(64) NOT NULL,           -- "Week 6", "Episode 45", etc.
    period_week INT,
    poll_url    TEXT,
    total_votes BIGINT,                          -- raw total from source page
    source_updated_at TIMESTAMP WITH TIME ZONE,
    fetched_at  TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW(),
    run_id      BIGINT       REFERENCES sentiment_ingestion_runs(id),
    UNIQUE (source_id, show_slug, period_label)
);
CREATE INDEX sentiment_polls_show_source ON sentiment_polls(show_slug, source_id);
CREATE INDEX sentiment_polls_fetched ON sentiment_polls(fetched_at DESC);

-- ── Per-contestant external vote observations ─────────────────────────────────
-- Each row = "source reported this many votes for this contestant in this period".
-- NEVER touch fan_votes or contestant_favourite_counts.
CREATE TABLE sentiment_observations (
    id              BIGSERIAL PRIMARY KEY,
    poll_id         BIGINT       NOT NULL REFERENCES sentiment_polls(id),
    contestant_id   BIGINT       REFERENCES contestants(id),      -- null if alias not resolved
    source_name     VARCHAR(200) NOT NULL,  -- raw name as it appeared on the source page
    source_slug     VARCHAR(200),           -- raw slug from source if any
    raw_count       BIGINT       NOT NULL,  -- votes as reported by source — DO NOT add to FanMeter totals
    share_pct       NUMERIC(6,3),           -- percentage of total within this poll
    rank_position   INT,
    resolved        BOOLEAN      NOT NULL DEFAULT FALSE, -- whether contestant_id was matched
    needs_review    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW()
);
CREATE INDEX sentiment_observations_poll ON sentiment_observations(poll_id);
CREATE INDEX sentiment_observations_contestant ON sentiment_observations(contestant_id);

-- ── Contestant alias map ──────────────────────────────────────────────────────
-- Maps source-specific name spellings to canonical DB contestant IDs.
CREATE TABLE sentiment_contestant_aliases (
    id              BIGSERIAL PRIMARY KEY,
    contestant_id   BIGINT       NOT NULL REFERENCES contestants(id),
    source_id       BIGINT       NOT NULL REFERENCES sentiment_sources(id),
    alias_name      VARCHAR(200) NOT NULL,
    alias_slug      VARCHAR(200),
    confidence      NUMERIC(4,3) NOT NULL DEFAULT 1.0, -- 1.0 = manually confirmed
    added_by        VARCHAR(32)  NOT NULL DEFAULT 'auto', -- auto|admin
    created_at      TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW(),
    UNIQUE (source_id, alias_slug)
);
CREATE INDEX sentiment_aliases_contestant ON sentiment_contestant_aliases(contestant_id);

-- ── Admin review queue ────────────────────────────────────────────────────────
-- Unresolved names that need manual alias mapping (DB-only, no UI).
CREATE TABLE sentiment_review_queue (
    id              BIGSERIAL PRIMARY KEY,
    source_id       BIGINT       NOT NULL REFERENCES sentiment_sources(id),
    show_slug       VARCHAR(64)  NOT NULL,
    source_name     VARCHAR(200) NOT NULL,
    source_slug     VARCHAR(200),
    period_label    VARCHAR(64),
    status          VARCHAR(32)  NOT NULL DEFAULT 'pending', -- pending|resolved|ignored
    resolved_contestant_id BIGINT REFERENCES contestants(id),
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW()
);
CREATE INDEX sentiment_review_queue_status ON sentiment_review_queue(status);

-- ── Combined score snapshots ──────────────────────────────────────────────────
-- Pre-computed Fan Sentiment Score per contestant per show per period.
-- Formula: E_c = 100 * SUM(w_s * p_s_c) / SUM(w_s)
--   where p_s_c = x_s_c / SUM(x_s_j for j in poll_s)  (normalized within-poll share)
CREATE TABLE sentiment_score_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    show_slug       VARCHAR(64)  NOT NULL,
    contestant_id   BIGINT       NOT NULL REFERENCES contestants(id),
    period_label    VARCHAR(64)  NOT NULL,
    fanmeter_votes  BIGINT       NOT NULL DEFAULT 0, -- FanMeter heart votes (from contestant_favourite_counts)
    fanmeter_share  NUMERIC(8,4),                    -- FanMeter share within show
    external_score  NUMERIC(8,4),                    -- weighted external share 0-100
    combined_score  NUMERIC(8,4),                    -- final combined score 0-100
    sources_used    INT          NOT NULL DEFAULT 0,
    computed_at     TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT NOW(),
    UNIQUE (show_slug, contestant_id, period_label)
);
CREATE INDEX sentiment_scores_show_period ON sentiment_score_snapshots(show_slug, period_label);
CREATE INDEX sentiment_scores_contestant ON sentiment_score_snapshots(contestant_id);

-- ── Seed approved sources ─────────────────────────────────────────────────────
INSERT INTO sentiment_sources (source_key, display_name, base_url, adapter_class, weight, enabled, robots_compliant, notes)
VALUES
    ('housepulse', 'HousePulse', 'https://housepulse.in',
     'com.fanclash.api.sentiment.adapter.HousePulseSentimentAdapter',
     1.0, TRUE, TRUE,
     'Nominations page includes vote percentage for each nominee. Crawled via Jsoup.'),
    ('tamilglitz', 'TamilGlitz', 'https://tamilglitz.in',
     'com.fanclash.api.sentiment.adapter.TamilGlitzSentimentAdapter',
     1.0, FALSE, TRUE,
     'TamilGlitz weekly poll — Tamil only. Disabled until robots.txt verification + manual spot-check.');
