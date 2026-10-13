-- V5: Remove Bigg Boss Tamil and Bigg Boss Telugu regional shows

-- Delete dependent records first (FK order: episodes → seasons → contestants → shows)
DELETE FROM episodes WHERE season_id IN (
    SELECT s.id FROM seasons s
    JOIN shows sh ON sh.id = s.show_id
    WHERE sh.slug IN ('bigg-boss-tamil', 'bigg-boss-telugu', 'bigg-boss-kannada')
);

DELETE FROM contestants WHERE season_id IN (
    SELECT s.id FROM seasons s
    JOIN shows sh ON sh.id = s.show_id
    WHERE sh.slug IN ('bigg-boss-tamil', 'bigg-boss-telugu', 'bigg-boss-kannada')
);

DELETE FROM seasons WHERE show_id IN (
    SELECT id FROM shows WHERE slug IN ('bigg-boss-tamil', 'bigg-boss-telugu', 'bigg-boss-kannada')
);

DELETE FROM shows WHERE slug IN ('bigg-boss-tamil', 'bigg-boss-telugu', 'bigg-boss-kannada');
