-- V21: Fix remaining Unsplash placeholders missed by V20 (slug mismatch corrections)
-- aasif-khan-hindi: slug stored with -hindi suffix; V20 used wrong slug
-- manish-goel-hindi, nakul-dhull: wildcard entrants added late, no HousePulse photo yet — skip

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1789459112399-asif_khan_bigg_boss/md.webp'
WHERE slug = 'aasif-khan-hindi'
  AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);
