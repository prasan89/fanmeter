-- V3: M2 schema additions
-- Adds language, descriptions, media fields and missing indexes

ALTER TABLE shows ADD COLUMN IF NOT EXISTS language VARCHAR(50) NOT NULL DEFAULT 'English';

ALTER TABLE seasons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS hero_image VARCHAR(500);

ALTER TABLE episodes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500);
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS duration_minutes INT;

ALTER TABLE contestants ADD COLUMN IF NOT EXISTS cover_image VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_shows_language ON shows (language);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes (status);
CREATE INDEX IF NOT EXISTS idx_contestants_status ON contestants (status);
