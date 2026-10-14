-- V19: Add Bigg Boss Hindi Season 20 and Bigg Boss Bangla Season 3
-- Sources (HousePulse + Wikipedia, retrieved 2026-10-14):
--   Hindi  S20: https://www.housepulse.in/shows/bigg-boss-hindi/season-20
--   Bangla  S3: https://www.housepulse.in/shows/bigg-boss-bangla/season-3
--   BB Bangla Wikipedia: https://en.wikipedia.org/wiki/Bigg_Boss_Bangla
-- Contestant bios reflect occupation from HousePulse; no bio is invented.
-- Profile images: Unsplash placeholders only; no contestant likeness used.

-- ── Shows ────────────────────────────────────────────────────────────────────

INSERT INTO shows (name, slug, category, language, description, status, image_url, created_at, updated_at)
VALUES
    ('Bigg Boss Hindi', 'bigg-boss-hindi', 'reality-tv', 'Hindi',
     'India''s most-watched reality show — Hindi edition on Colors TV and JioHotstar. Hosted by Salman Khan. Season 20 features 18 contestants from across entertainment and sport.',
     'live',
     'https://media.housepulse.in/studio/season-featured/2026/08/1785688715040-hindi_bigg_boss/master.webp',
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Bigg Boss Bangla', 'bigg-boss-bangla', 'reality-tv', 'Bengali',
     'The Bengali edition of Bigg Boss — Season 3 on Star Jalsha and JioHotstar after a decade-long hiatus. Hosted by Sourav Ganguly.',
     'live',
     'https://media.housepulse.in/studio/season-featured/2026/09/1788965542371-bigg-boss_bangla/master.webp',
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ── Hindi Season 20 ──────────────────────────────────────────────────────────

INSERT INTO seasons (show_id, name, season_number, status, description, hero_image, start_date, end_date, created_at, updated_at)
VALUES (
    (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi'),
    'Bigg Boss Hindi Season 20', 20, 'live',
    'Bigg Boss Hindi Season 20 premiered on 6 September 2026 on Colors TV and JioHotstar. Hosted by Salman Khan for the 16th consecutive season. 18 contestants including Olympic boxer Mary Kom and esports athlete Tanmay Singh (ScoutOP).',
    'https://media.housepulse.in/studio/season-featured/2026/08/1785688715040-hindi_bigg_boss/master.webp',
    '2026-09-06', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Hindi S20 contestants (HousePulse-verified as of 2026-10-14; 15 active, 3 eliminated)
INSERT INTO contestants (season_id, name, slug, profile_image, bio, status, source_url, sync_flag, created_at, updated_at)
SELECT s.id, c.name, c.slug, c.img, c.bio, c.status,
       'https://www.housepulse.in/shows/bigg-boss-hindi/season-20', 'ok',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM seasons s
CROSS JOIN (VALUES
    -- Active contestants
    ('Aasif Khan',          'aasif-khan-hindi',          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',  'Actor, Casting Director, Theatre Artist', 'active'),
    ('Aman Gandhi',         'aman-gandhi',               'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',  'Television Actor', 'active'),
    ('Amrapali Dubey',      'amrapali-dubey',            'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',  'Bhojpuri Actress, Television Actress, Model', 'active'),
    ('Harsh Vijay Machare', 'harsh-vijay-machare',       'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400',  'Rapper, Songwriter (Yung DSA)', 'active'),
    ('Kanika Mann',         'kanika-mann',               'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',  'Television Actress, Model', 'active'),
    ('Kushal Tanwar',       'kushal-tanwar',              'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',  'Reality TV Personality, Digital Creator (Gullu)', 'active'),
    ('Lovepreet Kaur Gill', 'lovepreet-kaur-gill',       'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',  'Punjabi Actress, Model (Love Gill)', 'active'),
    ('Mahhi Vij',           'mahhi-vij',                 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',  'Television Actress, Model', 'active'),
    ('Mary Kom',            'mary-kom',                  'https://images.unsplash.com/photo-1484863137850-59afcfe05386?w=400',  'Olympic Boxer, Former MP (Mangte Chungneijang Mary Kom)', 'active'),
    ('Qazi Touqeer',        'qazi-touqeer',              'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',  'Singer, Performer, Actor', 'active'),
    ('Sayyed Arishfa Khan', 'sayyed-arishfa-khan',       'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=400',  'Actress, Digital Creator', 'active'),
    ('Tanmay Singh',        'tanmay-singh-hindi',        'https://images.unsplash.com/photo-1546961342-ea5f62d951f4?w=400',  'Esports Athlete, Gaming Creator (ScoutOP)', 'active'),
    ('Uditi Singh',         'uditi-singh',               'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',  'Actress, Model, Digital Creator', 'active'),
    ('Manish Goel',         'manish-goel-hindi',         'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400',  'Television Actor (Wildcard)', 'active'),
    ('Nakul Dhull',         'nakul-dhull',               'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=400',  'Social Media Influencer (Wildcard)', 'active'),
    -- Eliminated
    ('Rhiti Tiwari',        'rhiti-tiwari',              'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400',  'Eliminated Week 4', 'eliminated'),
    ('Isha Rikhi',          'isha-rikhi',                'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400',  'Eliminated Week 3', 'eliminated'),
    ('Rohed Khan',          'rohed-khan',                'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400',  'Eliminated Week 2', 'eliminated')
) AS c(name, slug, img, bio, status)
WHERE s.show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi')
  AND s.season_number = 20;

-- ── Bangla Season 3 ──────────────────────────────────────────────────────────

INSERT INTO seasons (show_id, name, season_number, status, description, hero_image, start_date, end_date, created_at, updated_at)
VALUES (
    (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla'),
    'Bigg Boss Bangla Season 3', 3, 'live',
    'Bigg Boss Bangla Season 3 premiered on 30 August 2026 on Star Jalsha and JioHotstar, marking the show''s return after a decade-long hiatus. Hosted by Sourav Ganguly. 18 housemates.',
    'https://media.housepulse.in/studio/season-featured/2026/09/1788965542371-bigg-boss_bangla/master.webp',
    '2026-08-30', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Bangla S3 contestants (HousePulse-verified as of 2026-10-14; 11 active, 7 eliminated)
INSERT INTO contestants (season_id, name, slug, profile_image, bio, status, source_url, sync_flag, created_at, updated_at)
SELECT s.id, c.name, c.slug, c.img, c.bio, c.status,
       'https://www.housepulse.in/shows/bigg-boss-bangla/season-3', 'ok',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM seasons s
CROSS JOIN (VALUES
    -- Active contestants
    ('Bharat Kaul',         'bharat-kaul',               'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',  'Actor', 'active'),
    ('Durnibar Saha',       'durnibar-saha',             'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400',  'Singer, Playback Singer, Live Performer', 'active'),
    ('Jeetu Kamal',         'jeetu-kamal',               'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',  'Actor', 'active'),
    ('Jhilam Gupta',        'jhilam-gupta',              'https://images.unsplash.com/photo-1484863137850-59afcfe05386?w=400',  'Digital Creator, Writer', 'active'),
    ('Monami Ghosh',        'monami-ghosh',              'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',  'Actress, Dancer, Television Personality', 'active'),
    ('Nandini Dutta',       'nandini-dutta',             'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',  'Television and OTT Actress', 'active'),
    ('Niranjan Mondal',     'niranjan-mondal',           'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',  'Actor, Digital Creator', 'active'),
    ('Rajveer Dey',         'rajveer-dey',               'https://images.unsplash.com/photo-1546961342-ea5f62d951f4?w=400',  'Actor, Model, Reality Television Personality', 'active'),
    ('Sonamoni Saha',       'sonamoni-saha',             'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400',  'Television Actress', 'active'),
    ('Srijla Guha',         'srijla-guha',               'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',  'Actress, Model', 'active'),
    ('Tanushree Roy Das',   'tanushree-roy-das',         'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=400',  'Entrepreneur, Digital Creator', 'active'),
    -- Eliminated
    ('Anindya Sengupta',    'anindya-sengupta',          'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400',  'Actor, Executive Producer; Eliminated Week 1', 'eliminated'),
    ('Joyita Chatterjee',   'joyita-chatterjee',         'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400',  'Content Creator; Eliminated Week 2', 'eliminated'),
    ('Alexandra Taylor',    'alexandra-taylor',          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',  'Actress, Model; Eliminated Week 3', 'eliminated'),
    ('Sayak Chakraborty',   'sayak-chakraborty',         'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=400',  'Actor, YouTuber; Eliminated Week 3', 'eliminated'),
    ('Sohini Paul',         'sohini-paul',               'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400',  'Actress; Eliminated Week 4', 'eliminated'),
    ('Dipendu Biswas',      'dipendu-biswas',            'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400',  'Former Footballer, Politician; Eliminated Week 6', 'eliminated'),
    ('Anushka Ghosh',       'anushka-ghosh',             'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',  'Model, Reality TV Personality; Eliminated Week 6', 'eliminated')
) AS c(name, slug, img, bio, status)
WHERE s.show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla')
  AND s.season_number = 3;

-- ── Pre-seed favourite counts ────────────────────────────────────────────────
-- Ensures atomicIncrement (pure UPDATE) always finds an existing row

INSERT INTO contestant_favourite_counts (season_id, contestant_id, total, updated_at)
SELECT c.season_id, c.id, 0, CURRENT_TIMESTAMP
FROM contestants c
JOIN seasons s ON s.id = c.season_id
JOIN shows sh ON sh.id = s.show_id
WHERE sh.slug IN ('bigg-boss-hindi', 'bigg-boss-bangla')
  AND NOT EXISTS (
    SELECT 1 FROM contestant_favourite_counts cfc
    WHERE cfc.season_id = c.season_id AND cfc.contestant_id = c.id
  );
