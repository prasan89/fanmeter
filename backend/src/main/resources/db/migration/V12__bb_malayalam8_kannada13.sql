-- V12: Add Bigg Boss Malayalam Season 8 and Bigg Boss Kannada Season 13
-- Sources (Wikipedia, retrieved October 2026):
--   Malayalam S8: https://en.wikipedia.org/wiki/Bigg_Boss_(Malayalam_TV_series)_season_8
--   Kannada  S13: https://en.wikipedia.org/wiki/Bigg_Boss_Kannada_season_13
-- Contestant bios are factual (occupation/status) per Wikipedia; no bio is invented.
-- Profile images: Unsplash placeholders only; no contestant likeness used.

-- ── Shows ────────────────────────────────────────────────────────────────────

INSERT INTO shows (name, slug, category, language, description, status, image_url, created_at, updated_at)
VALUES
    ('Bigg Boss Malayalam', 'bigg-boss-malayalam', 'reality-tv', 'Malayalam',
     'India''s iconic reality show — Malayalam edition on Asianet and JioHotstar. Hosted by Mohanlal.',
     'live',
     'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=800',
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Bigg Boss Kannada', 'bigg-boss-kannada', 'reality-tv', 'Kannada',
     'India''s iconic reality show — Kannada edition on Colors Kannada and JioHotstar. Hosted by Kichcha Sudeepa.',
     'live',
     'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=800',
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ── Malayalam Season 8 ───────────────────────────────────────────────────────

INSERT INTO seasons (show_id, name, season_number, status, description, hero_image, start_date, end_date, created_at, updated_at)
VALUES (
    (SELECT id FROM shows WHERE slug = 'bigg-boss-malayalam'),
    'Bigg Boss Malayalam Season 8', 8, 'live',
    'Bigg Boss Malayalam Season 8 premiered on 6 September 2026 on Asianet and JioHotstar. Hosted by Mohanlal for the eighth consecutive season. Features 28 contestants — the highest in any Indian Bigg Boss version.',
    'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=1200',
    '2026-09-06', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Malayalam S8 contestants (Wikipedia-verified, October 2026)
-- 16 active, 12 eliminated/walked-out
INSERT INTO contestants (season_id, name, slug, profile_image, bio, status, source_url, sync_flag, created_at, updated_at)
SELECT s.id, c.name, c.slug, c.img, c.bio, c.status,
       'https://en.wikipedia.org/wiki/Bigg_Boss_(Malayalam_TV_series)_season_8', 'ok',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM seasons s
CROSS JOIN (VALUES
    -- Active contestants
    ('Aiswarya Madhu',           'aiswarya-madhu',           'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400', 'Radio Jockey', 'active'),
    ('RJ Anjali',                'rj-anjali',                'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', 'Radio Jockey / Actor', 'active'),
    ('Muhammad Azif',            'muhammad-azif',            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 'Content creator', 'active'),
    ('Goutham G Sasi',           'goutham-g-sasi',           'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', 'Stand-up comedian', 'active'),
    ('Mridula Vijay',            'mridula-vijay',            'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400', 'Television actor', 'active'),
    ('Neha Fathima',             'neha-fathima',             'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400', 'Content creator', 'active'),
    ('Nilina Elizabeth Joseph',  'nilina-elizabeth-joseph',  'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=400', 'Model (Wildcard)', 'active'),
    ('Noby Binu',                'noby-binu',                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 'Actor / Writer', 'active'),
    ('Nowfina Sabu',             'nowfina-sabu',             'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'Content creator (Wildcard)', 'active'),
    ('Rahul Easwar',             'rahul-easwar',             'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400', 'Social activist', 'active'),
    ('Tashi (Santhosh Raj)',     'tashi-santhosh-raj',       'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400', 'Digital strategist (Wildcard)', 'active'),
    ('Shijin S',                 'shijin-s',                 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=400', 'Dance coach', 'active'),
    ('Sreeraj K S',              'sreeraj-k-s',              'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400', 'Content creator / Adventurer', 'active'),
    ('Vedangi Cherukattu',       'vedangi-cherukattu',       'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400', 'Advocate / Social media influencer (Wildcard)', 'active'),
    ('Vignesh Venu',             'vignesh-venu',             'https://images.unsplash.com/photo-1546961342-ea5f62d951f4?w=400', 'Content creator', 'active'),
    ('Vipin Das Nair',           'vipin-das-nair',           'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400', 'Actor (Wildcard)', 'active'),
    -- Eliminated / walked-out contestants (retained for historical integrity)
    ('Gayathri Suresh',          'gayathri-suresh',          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', 'Evicted Day 2; re-entered Day 9; re-evicted Day 27', 'eliminated'),
    ('Dhanya',                   'dhanya',                   'https://images.unsplash.com/photo-1484863137850-59afcfe05386?w=400', 'Evicted Day 6', 'eliminated'),
    ('Rini Ann George',          'rini-ann-george',          'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=400', 'Evicted Day 7', 'eliminated'),
    ('Sreelaya',                 'sreelaya',                 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400', 'Evicted Day 14', 'eliminated'),
    ('Shibina',                  'shibina',                  'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400', 'Evicted Day 21 (Wildcard)', 'eliminated'),
    ('Rakesh Jacob',             'rakesh-jacob',             'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'Evicted Day 27', 'eliminated'),
    ('Loletta Loryne Rodrigues', 'loletta-loryne-rodrigues', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400', 'Evicted Day 27', 'eliminated'),
    ('Sumesh Chandran',          'sumesh-chandran',          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'Evicted Day 27', 'eliminated'),
    ('Jaseela Parveen',          'jaseela-parveen',          'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=400', 'Evicted Day 27', 'eliminated'),
    ('Sreelakshmi Arackal',      'sreelakshmi-arackal',      'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400', 'Evicted Day 27', 'eliminated'),
    ('Eldho George',             'eldho-george',             'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400', 'Evicted Day 35', 'eliminated'),
    ('Suvarna Pulthukkiyil',     'suvarna-pulthukkiyil',     'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400', 'Walked out Day 30 (health issues; Wildcard)', 'eliminated')
) AS c(name, slug, img, bio, status)
WHERE s.show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-malayalam')
  AND s.season_number = 8;

-- ── Kannada Season 13 ────────────────────────────────────────────────────────

INSERT INTO seasons (show_id, name, season_number, status, description, hero_image, start_date, end_date, created_at, updated_at)
VALUES (
    (SELECT id FROM shows WHERE slug = 'bigg-boss-kannada'),
    'Bigg Boss Kannada Season 13', 13, 'live',
    'Bigg Boss Kannada Season 13 premiered on 6 September 2026 on Colors Kannada and JioHotstar. Hosted by Kichcha Sudeepa for the 13th consecutive year. 21 housemates.',
    'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=1200',
    '2026-09-06', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Kannada S13 contestants (Wikipedia-verified, October 2026)
-- 14 active (incl. Tandav who re-entered Day 25), 8 eliminated
INSERT INTO contestants (season_id, name, slug, profile_image, bio, status, source_url, sync_flag, created_at, updated_at)
SELECT s.id, c.name, c.slug, c.img, c.bio, c.status,
       'https://en.wikipedia.org/wiki/Bigg_Boss_Kannada_season_13', 'ok',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM seasons s
CROSS JOIN (VALUES
    -- Active contestants
    ('Asiya Firdose',           'asiya-firdose',           'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', 'Actress', 'active'),
    ('Dhanush Manjunath',       'dhanush-manjunath',       'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 'Actor / Guinness World Record holder; House Captain', 'active'),
    ('Gagan Chinappa',          'gagan-chinappa',          'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400', 'Actor', 'active'),
    ('Ganavi Gowda',            'ganavi-gowda',            'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400', 'Reality TV personality (Wildcard Day 21)', 'active'),
    ('Jagadeesha MB',           'jagadeesha-mb',           'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 'Actor', 'active'),
    ('Kavya Gowda',             'kavya-gowda',             'https://images.unsplash.com/photo-1484863137850-59afcfe05386?w=400', 'Actress', 'active'),
    ('Kiran Shashtri',          'kiran-shashtri',          'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=400', 'Spiritual guru', 'active'),
    ('Kumari',                  'kumari',                  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400', 'Social media influencer (Late Wildcard Day 35)', 'active'),
    ('Lakshmi Gowda',           'lakshmi-gowda',           'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400', 'Model / Social media influencer (Late Wildcard Day 35)', 'active'),
    ('Mahakavi Manja',          'mahakavi-manja',          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', 'Writer', 'active'),
    ('Prashant Gowda',          'prashant-gowda',          'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=400', 'Comedian / Reality TV (Wildcard Day 21)', 'active'),
    ('Sonika Gowda',            'sonika-gowda',            'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=400', 'Actress / Model (Wildcard Day 21)', 'active'),
    ('Soundarya Shetty',        'soundarya-shetty',        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400', 'Model / Dancer (MTV Splitsvilla X6 finalist)', 'active'),
    ('Tandav Ram',              'tandav-ram',              'https://images.unsplash.com/photo-1546961342-ea5f62d951f4?w=400', 'Bodybuilder / Actor; evicted Day 18, re-entered Day 25', 'active'),
    ('Yashas Krishna',          'yashas-krishna',          'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400', 'Engineer / Actor', 'active'),
    -- Eliminated / walked-out / ejected contestants
    ('Prathama Prasad',         'prathama-prasad',         'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', 'Actress; Evicted Day 7', 'eliminated'),
    ('Om Prakash Rao',          'om-prakash-rao',          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'Film director / Comedian; Walked out Day 8', 'eliminated'),
    ('Avinash Shatamarshan',    'avinash-shatamarshan',    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400', 'Actor / Writer / Director; Evicted Day 21', 'eliminated'),
    ('Vaishnavi',               'vaishnavi',               'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400', 'Actress; Evicted Day 21', 'eliminated'),
    ('Likith Gondi',            'likith-gondi',            'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400', 'Content creator; Evicted Day 28', 'eliminated'),
    ('Sangeetha Bhat Sudarshan','sangeetha-bhat-sudarshan','https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400', 'Actress; Walked out Day 35', 'eliminated'),
    ('Manjunath',               'manjunath',               'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400', 'Ejected Day 35 (misconduct)', 'eliminated')
) AS c(name, slug, img, bio, status)
WHERE s.show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-kannada')
  AND s.season_number = 13;

-- ── Pre-seed favourite counts (mirrors V11 pattern) ──────────────────────────
-- Ensures atomicIncrement (pure UPDATE) always finds an existing row

INSERT INTO contestant_favourite_counts (season_id, contestant_id, total, updated_at)
SELECT c.season_id, c.id, 0, CURRENT_TIMESTAMP
FROM contestants c
JOIN seasons s ON s.id = c.season_id
JOIN shows sh ON sh.id = s.show_id
WHERE sh.slug IN ('bigg-boss-malayalam', 'bigg-boss-kannada')
  AND NOT EXISTS (
    SELECT 1 FROM contestant_favourite_counts cfc
    WHERE cfc.season_id = c.season_id AND cfc.contestant_id = c.id
  );
