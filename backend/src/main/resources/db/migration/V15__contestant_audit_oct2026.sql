-- V15: Contestant audit — October 14, 2026
-- Sources: HousePulse contestant pages + Wikipedia season articles
-- Changes:
--   Tamil S10  — Add Adavadi Ansar and TTF Vasan (wildcard entrants Week 5, Day 28)
--   Kannada S13 — Mark Mahakavi Manja as eliminated (ejected Day 35, misconduct)
--   Telugu S10  — No changes; all contestants verified correct
--   Malayalam S8 — No changes; all contestants verified correct

-- ── Tamil Season 10: add 2 missing wildcard entrants ─────────────────────────
-- Source: HousePulse (https://housepulse.in/shows/bigg-boss-tamil/season-10/contestants)
--         Wikipedia (https://en.wikipedia.org/wiki/Bigg_Boss_(Tamil_TV_series)_season_10)
-- Both sources confirm these two entered Day 28 (Week 5) as wildcard contestants.

INSERT INTO contestants (season_id, name, slug, profile_image, bio, status, source_url, sync_flag, created_at, updated_at)
SELECT s.id, c.name, c.slug, c.img, c.bio, c.status, c.source_url, 'ok', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM seasons s
CROSS JOIN (VALUES
    ('Adavadi Ansar',
     'adavadi-ansar',
     'https://media.housepulse.in/studio/contestants/season-74-bigg-boss-tamil-season-10/profile/1788756856985-adavadi_ansar_bigg_boss/sm.webp',
     'Wildcard entrant (Day 28)',
     'active',
     'https://housepulse.in/shows/bigg-boss-tamil/season-10/contestants'),
    ('TTF Vasan',
     'ttf-vasan',
     'https://media.housepulse.in/studio/contestants/season-74-bigg-boss-tamil-season-10/profile/1791128373153-ttf_vasan_bigg_boss/sm.webp',
     'Wildcard entrant (Day 28)',
     'active',
     'https://housepulse.in/shows/bigg-boss-tamil/season-10/contestants')
) AS c(name, slug, img, bio, status, source_url)
WHERE s.show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-tamil')
  AND s.season_number = 10
  -- Guard against duplicates
  AND NOT EXISTS (
      SELECT 1 FROM contestants cx
      WHERE cx.season_id = s.id AND cx.slug = c.slug
  );

-- Initialise favourite-count rows for new Tamil contestants (required by additive-favourites schema)
INSERT INTO contestant_favourite_counts (season_id, contestant_id, total, updated_at)
SELECT c.season_id, c.id, 0, CURRENT_TIMESTAMP
FROM contestants c
JOIN seasons s ON s.id = c.season_id
JOIN shows sh ON sh.id = s.show_id
WHERE sh.slug = 'bigg-boss-tamil'
  AND s.season_number = 10
  AND c.slug IN ('adavadi-ansar', 'ttf-vasan')
  AND NOT EXISTS (
      SELECT 1 FROM contestant_favourite_counts cfc
      WHERE cfc.season_id = c.season_id AND cfc.contestant_id = c.id
  );

-- ── Kannada Season 13: correct Mahakavi Manja status ─────────────────────────
-- Source: HousePulse (https://housepulse.in/shows/bigg-boss-kannada/season-13/contestants)
-- "Modern Mahakavi Manja" ejected Week 5 (Day 35) for misconduct — same person as
-- the seeded 'Mahakavi Manja'. The seed also contains a separate 'Manjunath' record
-- (also eliminated Day 35) which was intended to represent this same ejection event.
-- Action: mark Mahakavi Manja as eliminated; flag Manjunath for manual review.

UPDATE contestants
SET status       = 'eliminated',
    bio          = 'Writer; ejected Day 35 (misconduct)',
    sync_notes   = 'Status corrected by V15 audit (Oct 2026). HousePulse + Wikipedia confirm ejection Day 35.',
    sync_flag    = 'ok',
    updated_at   = CURRENT_TIMESTAMP
WHERE slug = 'mahakavi-manja'
  AND season_id = (
      SELECT s.id FROM seasons s
      JOIN shows sh ON sh.id = s.show_id
      WHERE sh.slug = 'bigg-boss-kannada' AND s.season_number = 13
  );

-- Flag the duplicate 'Manjunath' record for manual review (likely a seed error —
-- same person as Mahakavi Manja). Do not delete: preserve historical data integrity.
UPDATE contestants
SET sync_flag  = 'needs_review',
    sync_notes = 'V15 audit: possible duplicate of Mahakavi Manja (same ejection event). Verify and merge if confirmed.',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'manjunath'
  AND season_id = (
      SELECT s.id FROM seasons s
      JOIN shows sh ON sh.id = s.show_id
      WHERE sh.slug = 'bigg-boss-kannada' AND s.season_number = 13
  );
