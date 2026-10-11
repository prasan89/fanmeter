-- V5: Fan voting, community discussions, reactions, and reports.
-- The MVP uses a persistent browser voter key; stronger identity verification is a
-- prerequisite for allowing votes to influence anything beyond an unofficial poll.

CREATE TABLE voting_rounds (
    id BIGSERIAL PRIMARY KEY,
    season_id BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('draft', 'open', 'closed')),
    opens_at TIMESTAMP,
    closes_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (closes_at IS NULL OR opens_at IS NULL OR closes_at > opens_at)
);
CREATE INDEX idx_voting_rounds_season_status ON voting_rounds(season_id, status);

CREATE TABLE fan_votes (
    id BIGSERIAL PRIMARY KEY,
    voting_round_id BIGINT NOT NULL REFERENCES voting_rounds(id) ON DELETE CASCADE,
    contestant_id BIGINT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
    voter_key VARCHAR(128) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (voting_round_id, contestant_id, voter_key)
);
CREATE INDEX idx_fan_votes_round_contestant ON fan_votes(voting_round_id, contestant_id);
CREATE INDEX idx_fan_votes_voter_created ON fan_votes(voter_key, created_at DESC);

CREATE TABLE fan_posts (
    id BIGSERIAL PRIMARY KEY,
    season_id BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    contestant_id BIGINT REFERENCES contestants(id) ON DELETE CASCADE,
    voter_key VARCHAR(128) NOT NULL,
    display_name VARCHAR(40) NOT NULL DEFAULT 'Fan',
    body VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'published'
        CHECK (status IN ('published', 'hidden', 'removed')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fan_posts_season_created ON fan_posts(season_id, created_at DESC);
CREATE INDEX idx_fan_posts_contestant_created ON fan_posts(contestant_id, created_at DESC);

CREATE TABLE fan_post_reactions (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES fan_posts(id) ON DELETE CASCADE,
    voter_key VARCHAR(128) NOT NULL,
    reaction VARCHAR(12) NOT NULL CHECK (reaction IN ('🔥', '❤️', '😂', '👏')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (post_id, voter_key)
);
CREATE INDEX idx_fan_post_reactions_post ON fan_post_reactions(post_id);

CREATE TABLE fan_reports (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES fan_posts(id) ON DELETE CASCADE,
    reporter_key VARCHAR(128) NOT NULL,
    reason VARCHAR(30) NOT NULL CHECK (reason IN ('harassment', 'spam', 'hate', 'personal_info', 'other')),
    details VARCHAR(300),
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (post_id, reporter_key)
);
CREATE INDEX idx_fan_reports_status_created ON fan_reports(status, created_at);
