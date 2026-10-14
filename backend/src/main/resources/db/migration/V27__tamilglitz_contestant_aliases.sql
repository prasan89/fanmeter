-- Manual aliases for TamilGlitz poll names → DB contestants (Tamil season 10)
-- TamilGlitz uses first-name-only or alternate spellings; maps them precisely.
INSERT INTO sentiment_contestant_aliases
    (source_id, contestant_id, alias_name, alias_slug, confidence, added_by)
SELECT s.id, v.cid, v.alias_name, v.alias_slug, 1.0, 'admin'
FROM sentiment_sources s
CROSS JOIN (VALUES
    ('Shathika',  'shathika',   21),
    ('Chandhini', 'chandhini',  11),
    ('Akshatha',  'akshatha',   23),
    ('Karishma',  'karishma',   24),
    ('Avinash',   'avinash',     9),
    ('Shama',     'shama',      20),
    ('Mukesh',    'mukesh',     15),
    ('TTF Vasan', 'ttf-vasan', 104)
) AS v(alias_name, alias_slug, cid)
WHERE s.source_key = 'tamilglitz'
ON CONFLICT (source_id, alias_slug) DO NOTHING;
