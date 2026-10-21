-- V29: Chat moderation — restrictions, user reports, moderation queue

-- ── Chat restrictions ──────────────────────────────────────────────────────
-- Replaces the simple banned_until field on chat_guest_tokens for structured enforcement.
-- Scope: ROOM (one room), EVENT (all rooms for an event slug), GLOBAL (entire platform).
-- Type: WARNING, TIMEOUT, PERMANENT_BAN.

CREATE TABLE chat_restrictions (
    id              BIGSERIAL       PRIMARY KEY,
    guest_token     VARCHAR(64)     NOT NULL,
    scope           VARCHAR(20)     NOT NULL CHECK (scope IN ('ROOM', 'EVENT', 'GLOBAL')),
    scope_ref       VARCHAR(200),                   -- room_id for ROOM, event_slug for EVENT, null for GLOBAL
    restriction_type VARCHAR(20)    NOT NULL CHECK (restriction_type IN ('WARNING', 'TIMEOUT', 'PERMANENT_BAN')),
    reason_category VARCHAR(50)     NOT NULL,        -- SPAM, HARASSMENT, HATE_SPEECH, THREAT, SEXUAL, DOXXING, OTHER
    starts_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP,                      -- NULL = permanent
    issuer          VARCHAR(64)     NOT NULL,        -- "system" or moderator ID
    appeal_status   VARCHAR(20)     NOT NULL DEFAULT 'NONE' CHECK (appeal_status IN ('NONE', 'PENDING', 'APPROVED', 'REJECTED')),
    appeal_note     TEXT,
    audit_metadata  JSONB,                          -- severity score, rule matches, etc. (no raw message text)
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at      TIMESTAMP,
    revoked_by      VARCHAR(64)
);

CREATE INDEX idx_chat_restrictions_token        ON chat_restrictions(guest_token, restriction_type, expires_at);
CREATE INDEX idx_chat_restrictions_active_room  ON chat_restrictions(scope_ref, guest_token) WHERE revoked_at IS NULL;
CREATE INDEX idx_chat_restrictions_appeals      ON chat_restrictions(appeal_status);
CREATE INDEX idx_chat_restrictions_created      ON chat_restrictions(created_at DESC);

-- ── Chat reports ──────────────────────────────────────────────────────────
-- Users can report individual messages. Reporter identity is never exposed to the reported user.

CREATE TABLE chat_reports (
    id              BIGSERIAL       PRIMARY KEY,
    room_id         VARCHAR(200)    NOT NULL,
    message_id      BIGINT          REFERENCES chat_messages(id) ON DELETE SET NULL,
    reporter_token  VARCHAR(64)     NOT NULL,
    reported_token  VARCHAR(64),                    -- denormalized for quick lookup
    category        VARCHAR(50)     NOT NULL CHECK (category IN (
                        'HARASSMENT', 'HATE_SPEECH', 'THREAT', 'SEXUAL_CONTENT',
                        'SPAM', 'PRIVATE_INFO', 'OTHER')),
    priority        VARCHAR(20)     NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'HIGH', 'CRITICAL')),
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at     TIMESTAMP,
    reviewer        VARCHAR(64),
    outcome         VARCHAR(50),                    -- NO_ACTION, WARNING, TIMEOUT, BAN, MESSAGE_REMOVED
    UNIQUE (message_id, reporter_token)             -- one report per message per user
);

CREATE INDEX idx_chat_reports_room     ON chat_reports(room_id, created_at DESC);
CREATE INDEX idx_chat_reports_pending  ON chat_reports(reviewed_at, priority) WHERE reviewed_at IS NULL;
CREATE INDEX idx_chat_reports_reporter ON chat_reports(reporter_token, created_at DESC);
CREATE INDEX idx_chat_reports_reported ON chat_reports(reported_token, created_at DESC);

-- ── Moderation queue ──────────────────────────────────────────────────────
-- Messages flagged for human review before or after publishing.
-- status: PENDING → ASSIGNED → RESOLVED

CREATE TABLE chat_mod_queue (
    id              BIGSERIAL       PRIMARY KEY,
    message_id      BIGINT          REFERENCES chat_messages(id) ON DELETE CASCADE,
    room_id         VARCHAR(200)    NOT NULL,
    flag_reason     VARCHAR(50)     NOT NULL,        -- rule name or report category that triggered queue
    severity        VARCHAR(20)     NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'RESOLVED')),
    assigned_to     VARCHAR(64),
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMP,
    resolution      VARCHAR(50),                    -- ALLOWED, REMOVED, USER_WARNED, USER_TIMED_OUT, USER_BANNED
    resolver        VARCHAR(64),
    notes           TEXT
);

CREATE INDEX idx_chat_mod_queue_pending  ON chat_mod_queue(status, severity, created_at) WHERE status != 'RESOLVED';
CREATE INDEX idx_chat_mod_queue_room     ON chat_mod_queue(room_id, created_at DESC);

-- ── Track violation count for escalation ─────────────────────────────────
-- Denormalized running tally avoids expensive COUNT(*) on every send.
-- Reset is NOT automatic — moderators clear it manually for rehabilitated users.

CREATE TABLE chat_violation_counts (
    guest_token     VARCHAR(64)     PRIMARY KEY,
    minor_count     INT             NOT NULL DEFAULT 0,
    serious_count   INT             NOT NULL DEFAULT 0,
    last_violation  TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
