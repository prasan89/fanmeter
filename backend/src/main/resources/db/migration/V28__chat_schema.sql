-- V28: Fan chat rooms and messages
-- One room per event/season. Messages are soft-deleted for moderation audit trail.

CREATE TABLE chat_rooms (
    id          BIGSERIAL    PRIMARY KEY,
    room_id     VARCHAR(200) NOT NULL UNIQUE,   -- e.g. "event:bigg-boss-tamil-10:season:6"
    season_id   BIGINT       REFERENCES seasons(id) ON DELETE SET NULL,
    event_slug  VARCHAR(200) NOT NULL,
    slow_mode_seconds INT NOT NULL DEFAULT 0,
    is_paused   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_rooms_room_id ON chat_rooms(room_id);
CREATE INDEX idx_chat_rooms_season  ON chat_rooms(season_id);

CREATE TABLE chat_messages (
    id               BIGSERIAL    PRIMARY KEY,
    room_id          VARCHAR(200) NOT NULL,
    guest_token      VARCHAR(64)  NOT NULL,      -- server-issued opaque token
    display_name     VARCHAR(50)  NOT NULL,
    message_text     VARCHAR(500) NOT NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP,                  -- soft delete
    deleted_by       VARCHAR(64),                -- moderator token or "system"
    idempotency_key  VARCHAR(64),                -- client-supplied, prevents duplicate sends
    CONSTRAINT fk_chat_messages_room FOREIGN KEY (room_id) REFERENCES chat_rooms(room_id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_messages_room_created  ON chat_messages(room_id, created_at DESC);
CREATE INDEX idx_chat_messages_guest_room    ON chat_messages(guest_token, room_id);
CREATE INDEX idx_chat_messages_idempotency   ON chat_messages(room_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_chat_messages_deleted       ON chat_messages(room_id, created_at DESC) WHERE deleted_at IS NULL;

-- Guest identity tokens (server-issued, used to correlate messages without accounts)
CREATE TABLE chat_guest_tokens (
    token           VARCHAR(64)  PRIMARY KEY,
    display_name    VARCHAR(50)  NOT NULL,
    ip_fingerprint  VARCHAR(64),                 -- hashed, for abuse detection; never exposed to clients
    banned_until    TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Moderation audit log
CREATE TABLE chat_moderation_log (
    id           BIGSERIAL   PRIMARY KEY,
    room_id      VARCHAR(200),
    target_token VARCHAR(64),
    action       VARCHAR(50) NOT NULL,           -- DELETE_MESSAGE, BAN, TIMEOUT, UNBAN
    message_id   BIGINT      REFERENCES chat_messages(id) ON DELETE SET NULL,
    moderator    VARCHAR(64) NOT NULL,            -- "admin" or moderator token
    reason       TEXT,
    created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_mod_log_room   ON chat_moderation_log(room_id, created_at DESC);
CREATE INDEX idx_chat_mod_log_target ON chat_moderation_log(target_token, created_at DESC);
