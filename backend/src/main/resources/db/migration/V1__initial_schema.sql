-- V1: Initial FanClash schema
-- Generic fan engagement platform schema supporting multiple show categories

CREATE TABLE shows (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    category    VARCHAR(100) NOT NULL,
    description TEXT,
    status      VARCHAR(50)  NOT NULL DEFAULT 'upcoming',
    image_url   VARCHAR(500),
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shows_slug ON shows (slug);
CREATE INDEX idx_shows_category ON shows (category);
CREATE INDEX idx_shows_status ON shows (status);

CREATE TABLE seasons (
    id            BIGSERIAL PRIMARY KEY,
    show_id       BIGINT       NOT NULL REFERENCES shows (id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    season_number INT          NOT NULL,
    status        VARCHAR(50)  NOT NULL DEFAULT 'upcoming',
    start_date    DATE,
    end_date      DATE,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (show_id, season_number)
);

CREATE INDEX idx_seasons_show_id ON seasons (show_id);
CREATE INDEX idx_seasons_status ON seasons (status);

CREATE TABLE episodes (
    id             BIGSERIAL PRIMARY KEY,
    season_id      BIGINT       NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
    episode_number INT          NOT NULL,
    title          VARCHAR(255) NOT NULL,
    air_date       DATE,
    status         VARCHAR(50)  NOT NULL DEFAULT 'upcoming',
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (season_id, episode_number)
);

CREATE INDEX idx_episodes_season_id ON episodes (season_id);
CREATE INDEX idx_episodes_air_date ON episodes (air_date);

CREATE TABLE contestants (
    id            BIGSERIAL PRIMARY KEY,
    season_id     BIGINT       NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    slug          VARCHAR(255) NOT NULL,
    profile_image VARCHAR(500),
    bio           TEXT,
    status        VARCHAR(50)  NOT NULL DEFAULT 'active',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (season_id, slug)
);

CREATE INDEX idx_contestants_season_id ON contestants (season_id);
CREATE INDEX idx_contestants_slug ON contestants (slug);
CREATE INDEX idx_contestants_status ON contestants (status);
