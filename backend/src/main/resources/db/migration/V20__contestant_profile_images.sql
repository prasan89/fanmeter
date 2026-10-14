-- V20: Replace Unsplash placeholders with real HousePulse contestant profile images
-- for Bigg Boss Hindi Season 20 and Bigg Boss Bangla Season 3.
-- Source: https://www.housepulse.in/shows/bigg-boss-hindi/season-20
--         https://www.housepulse.in/shows/bigg-boss-bangla/season-3
-- Retrieved: 2026-10-14

-- ── Hindi Season 20 ──────────────────────────────────────────────────────────

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1789459112399-asif_khan_bigg_boss/md.webp'
WHERE slug = 'aasif-khan' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1790172873134-aman_gandhi_bigg_boss/md.webp'
WHERE slug = 'aman-gandhi' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1790172862355-aamrapali_bigg_boss/md.webp'
WHERE slug = 'amrapali-dubey' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1790172671403-yung_dsa_bigg_boss/md.webp'
WHERE slug = 'harsh-vijay-machare' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1788952938573-kanika_bigg_boss/md.webp'
WHERE slug = 'kanika-mann' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1790172850748-gullu_bigg_boss/md.webp'
WHERE slug = 'kushal-tanwar' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1788952953626-love_bigg_boss/md.webp'
WHERE slug = 'lovepreet-kaur-gill' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1790172793909-mahhivij_bigg_boss/md.webp'
WHERE slug = 'mahhi-vij' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1790172798750-mary_kom_bigg_boss/md.webp'
WHERE slug = 'mary-kom' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1790172752388-qazi_bigg_boss/md.webp'
WHERE slug = 'qazi-touqeer' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1788952967021-arishfakhan_bigg_boss/md.webp'
WHERE slug = 'sayyed-arishfa-khan' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1789459131277-tanmay_singh_biggboss/md.webp'
WHERE slug = 'tanmay-singh-hindi' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1788952977134-uditi_bigg_boss/md.webp'
WHERE slug = 'uditi-singh' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1790172740757-rhiti_tiwari_bigg_boss/md.webp'
WHERE slug = 'rhiti-tiwari' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1790172687401-isharikhi_bigg_boss/md.webp'
WHERE slug = 'isha-rikhi' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-75-bigg-boss-hindi-season-20/profile/1789459120775-rohed_khan_biggboss/md.webp'
WHERE slug = 'rohed-khan' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-hindi') AND season_number = 20);

-- ── Bangla Season 3 ──────────────────────────────────────────────────────────

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788878931676-bharat_bigg_boss/md.webp'
WHERE slug = 'bharat-kaul' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788878953075-durnibar_bigg_boss/md.webp'
WHERE slug = 'durnibar-saha' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1790173973548-jeetu_kamal_bigg_boss/md.webp'
WHERE slug = 'jeetu-kamal' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788939647452-jhilam_bigg_boss/md.webp'
WHERE slug = 'jhilam-gupta' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788939658238-monami_bigg_boss/md.webp'
WHERE slug = 'monami-ghosh' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788939668927-nandini_dutta_bigg_boss/md.webp'
WHERE slug = 'nandini-dutta' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788939680894-niranjan_bigg_boss/md.webp'
WHERE slug = 'niranjan-mondal' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788939694406-rajveer_bigg_boss/md.webp'
WHERE slug = 'rajveer-dey' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788939751989-sona_bigg_boss/md.webp'
WHERE slug = 'sonamoni-saha' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788879144169-srijlaguha_bigg_boss/md.webp'
WHERE slug = 'srijla-guha' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788939781457-roy_anushree_bigg_boss/md.webp'
WHERE slug = 'tanushree-roy-das' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788878942262-dipendu_bigg_boss/md.webp'
WHERE slug = 'dipendu-biswas' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788939735666-sohini_bigg_boss/md.webp'
WHERE slug = 'sohini-paul' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788878916589-alexandra_bigg_boss/md.webp'
WHERE slug = 'alexandra-taylor' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788939706251-sayak_bigg_boss/md.webp'
WHERE slug = 'sayak-chakraborty' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788878962960-joyitaa_bigg_boss/md.webp'
WHERE slug = 'joyita-chatterjee' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);

UPDATE contestants SET profile_image = 'https://media.housepulse.in/studio/contestants/season-80-bigg-boss-bangla-season-3/profile/1788939633290-avindya_bigg_boss/md.webp'
WHERE slug = 'anindya-sengupta' AND season_id = (SELECT id FROM seasons WHERE show_id = (SELECT id FROM shows WHERE slug = 'bigg-boss-bangla') AND season_number = 3);
