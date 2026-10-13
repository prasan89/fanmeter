-- V8: Add Wikipedia sync tracking columns to contestants
-- and a sync_log table for the daily Wikipedia sync job.

ALTER TABLE contestants ADD COLUMN IF NOT EXISTS source_url    VARCHAR(500);
ALTER TABLE contestants ADD COLUMN IF NOT EXISTS verified_at   TIMESTAMP;
ALTER TABLE contestants ADD COLUMN IF NOT EXISTS sync_notes    VARCHAR(500);
ALTER TABLE contestants ADD COLUMN IF NOT EXISTS sync_flag     VARCHAR(20) DEFAULT 'ok';

ALTER TABLE contestants ADD CONSTRAINT IF NOT EXISTS chk_sync_flag
    CHECK (sync_flag IN ('ok', 'needs_review', 'unverified'));

CREATE TABLE IF NOT EXISTS contestant_sync_logs (
    id          BIGSERIAL PRIMARY KEY,
    started_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    status      VARCHAR(20) NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'success', 'failed', 'partial')),
    show_slug   VARCHAR(100),
    updated_count  INTEGER DEFAULT 0,
    flagged_count  INTEGER DEFAULT 0,
    error_detail   TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON contestant_sync_logs(started_at DESC);
