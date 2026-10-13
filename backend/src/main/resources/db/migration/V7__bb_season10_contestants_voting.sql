-- V7: Add Bigg Boss Tamil Season 10 and Bigg Boss Telugu Season 10
-- Source: Wikipedia (retrieved October 2026)
-- BB Tamil S10: https://en.wikipedia.org/wiki/Bigg_Boss_(Tamil_TV_series)_season_10
-- BB Telugu S10: https://en.wikipedia.org/wiki/Bigg_Boss_(Telugu_TV_series)_season_10
-- Contestant bios are intentionally blank — not fabricated.
-- Profile images use Unsplash placeholders only; no contestant likeness used.

-- ── Shows ────────────────────────────────────────────────────────────────────

INSERT INTO shows (name, slug, category, language, description, status, image_url, created_at, updated_at)
VALUES
    ('Bigg Boss Tamil', 'bigg-boss-tamil', 'reality-tv', 'Tamil',
     'India''s iconic reality show — Tamil edition. Contestants live together under one roof, compete in tasks and face weekly public evictions. Hosted by Vijay Sethupathi.',
     'live',
     'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Bigg Boss Telugu', 'bigg-boss-telugu', 'reality-tv', 'Telugu',
     'India''s iconic reality show — Telugu edition on Star Maa. Contestants face weekly public voting for eviction. Hosted by Nagarjuna.',
     'live',
     'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800',
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ── Tamil Season 10 ──────────────────────────────────────────────────────────

INSERT INTO seasons (show_id, name, season_number, status, description, hero_image, start_date, end_date, created_at, updated_at)
VALUES (
    (SELECT id FROM shows WHERE slug = 'bigg-boss-tamil'),
    'Bigg Boss Tamil Season 10 — Carnivizha', 10, 'live',
    'Bigg Boss Tamil Season 10, themed "Carnivizha", premiered on September 6 2026 on Star Vijay and JioHotstar. Hosted by Vijay Sethupathi. 24 contestants entered the house.',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200',
    '2026-09-06', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Tamil S10 contestants (Wikipedia-verified as of Oct 11 2026)
INSERT INTO contestants (season_id, name, slug, profile_image, bio, status, created_at, updated_at)
SELECT s.id, c.name, c.slug, c.img, c.bio, c.status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM seasons s
CROSS JOIN (VALUES
    ('Avinash Ashok',        'avinash-ashok',        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',  '', 'active'),
    ('Asmitha Neelamegam',   'asmitha-neelamegam',   'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',  '', 'active'),
    ('Chandini Tamilarasan', 'chandini-tamilarasan', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',  '', 'active'),
    ('Dhanyaa Pallath',      'dhanyaa-pallath',      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',  '', 'active'),
    ('Jason Koushi',         'jason-koushi',         'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',  '', 'active'),
    ('Lakshmi Priya',        'lakshmi-priya',        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',  '', 'active'),
    ('Mukesh',               'mukesh',               'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',  '', 'active'),
    ('Muniyammal Banumathi', 'muniyammal-banumathi', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',  '', 'active'),
    ('Muthazhagi',           'muthazhagi',           'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',  '', 'active'),
    ('Prithvinath',          'prithvinath',          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',  '', 'active'),
    ('Raaghav',              'raaghav',              'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400',  '', 'active'),
    ('Shama M',              'shama-m',              'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400',  '', 'active'),
    ('Shathiga',             'shathiga',             'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400',  '', 'active'),
    ('Vinoth Babu',          'vinoth-babu',          'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400',  '', 'active'),
    ('Akshitha Ashok',       'akshitha-ashok',       'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=400',  'Wildcard entrant (Day 28)', 'active'),
    ('Karishma Sama',        'karishma-sama',        'https://images.unsplash.com/photo-1484863137850-59afcfe05386?w=400',  'Wildcard entrant (Day 28)', 'active'),
    ('Savinya Velu',         'savinya-velu',         'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=400',  'Eliminated Day 28', 'eliminated'),
    ('Javeed Sheriff',       'javeed-sheriff',       'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=400',  'Eliminated Day 28', 'eliminated'),
    ('Anandhi Ajay',         'anandhi-ajay',         'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400',  'Eliminated Day 20', 'eliminated'),
    ('Manivannan Uppiliappan','manivannan-uppiliappan','https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400', 'Eliminated Day 14', 'eliminated'),
    ('Pandi',                'pandi',                'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400',  'Walked out Day 3', 'eliminated'),
    ('Kumaran Thangarajan',  'kumaran-thangarajan',  'https://images.unsplash.com/photo-1546961342-ea5f62d951f4?w=400',  'Took cash prize, walked out Day 24', 'eliminated')
) AS c(name, slug, img, bio, status)
WHERE s.show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-tamil')
  AND s.season_number = 10;

-- ── Telugu Season 10 ─────────────────────────────────────────────────────────

INSERT INTO seasons (show_id, name, season_number, status, description, hero_image, start_date, end_date, created_at, updated_at)
VALUES (
    (SELECT id FROM shows WHERE slug = 'bigg-boss-telugu'),
    'Bigg Boss Telugu Season 10 — Dasavatharam', 10, 'live',
    'Bigg Boss Telugu Season 10, themed "Dasavatharam", premiered on September 6 2026 on Star Maa and JioHotstar. Hosted by Nagarjuna for the ninth consecutive season.',
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200',
    '2026-09-06', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Telugu S10 contestants (Wikipedia-verified as of Oct 11 2026)
INSERT INTO contestants (season_id, name, slug, profile_image, bio, status, created_at, updated_at)
SELECT s.id, c.name, c.slug, c.img, c.bio, c.status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM seasons s
CROSS JOIN (VALUES
    ('Debjani Modak',            'debjani-modak',            'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',  'Original celebrity contestant', 'active'),
    ('Adith Eswaran',            'adith-eswaran',            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',  'Original celebrity contestant (also known as Thrigun)', 'active'),
    ('Sudheer Reddy',            'sudheer-reddy',            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',  'Original celebrity contestant', 'active'),
    ('Auto Ramprasad',           'auto-ramprasad',           'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',  'Original celebrity contestant', 'active'),
    ('Temper Vamsi',             'temper-vamsi',             'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400',  'Original celebrity contestant', 'active'),
    ('Naresh',                   'naresh',                   'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400',  'Original celebrity contestant', 'active'),
    ('Varshini Sounderajan',     'varshini-sounderajan',     'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',  'Original celebrity contestant', 'active'),
    ('Nihar Mukesh Gowda',       'nihar-mukesh-gowda',       'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',  'Original celebrity contestant', 'active'),
    ('Jhansi',                   'jhansi',                   'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400',  'Original commoner contestant', 'active'),
    ('Aman Masud',               'aman-masud',               'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400',  'Original commoner contestant', 'active'),
    ('Shalini Damera Patel',     'shalini-damera-patel',     'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',  'Original commoner contestant', 'active'),
    ('Rohit Naidu Patnam',       'rohit-naidu-patnam',       'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400',  'Original commoner contestant', 'active'),
    ('Shivakumar Marihal',       'shivakumar-marihal',       'https://images.unsplash.com/photo-1546961342-ea5f62d951f4?w=400',  'Wildfire entrant (Day 35)', 'active'),
    ('Dakshi Guthikonda',        'dakshi-guthikonda',        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',  'Wildfire entrant (Day 35)', 'active'),
    ('Neethu Nataraj',           'neethu-nataraj',           'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400',  'Wildfire entrant (Day 35)', 'active'),
    ('Swetha Naidu',             'swetha-naidu',             'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',  'Wildfire entrant (Day 35)', 'active'),
    ('Ramakrishna Koyya',        'ramakrishna-koyya',        'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=400',  'Wildfire entrant (Day 35)', 'active'),
    ('Chaitra Rai',              'chaitra-rai',              'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',  'Evicted Day 5', 'eliminated'),
    ('Krishnudu',                'krishnudu',                'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400',  'Evicted Day 14', 'eliminated'),
    ('Shiva Srishti Vyakaranam', 'shiva-srishti-vyakaranam', 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400',  'Evicted Day 28', 'eliminated'),
    ('Charan Mahadev',           'charan-mahadev',           'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400',  'Evicted Day 35', 'eliminated'),
    ('Apoorva Tungaturthy',      'apoorva-tungaturthy',      'https://images.unsplash.com/photo-1484863137850-59afcfe05386?w=400',  'Wildcard, evicted Day 35', 'eliminated'),
    ('Mithilesh Reddy',          'mithilesh-reddy',          'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=400',  'Wildcard, walked out Day 20 (took ₹15 lakh)', 'eliminated')
) AS c(name, slug, img, bio, status)
WHERE s.show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-telugu')
  AND s.season_number = 10;

-- ── Voting rounds (one open round per live season) ────────────────────────────

INSERT INTO voting_rounds (season_id, title, status, opens_at, closes_at)
SELECT id, 'Week 6 Eviction Vote — BB Tamil Season 10', 'open',
       '2026-10-10 00:00:00', '2026-10-15 23:59:59'
FROM seasons
WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-tamil')
  AND season_number = 10;

INSERT INTO voting_rounds (season_id, title, status, opens_at, closes_at)
SELECT id, 'Week 6 Eviction Vote — BB Telugu Season 10', 'open',
       '2026-10-10 00:00:00', '2026-10-15 23:59:59'
FROM seasons
WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-telugu')
  AND season_number = 10;
