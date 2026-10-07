-- V4: M2 seed data enrichment

-- Update show languages
UPDATE shows SET language = 'Tamil'   WHERE slug = 'bigg-boss-tamil';
UPDATE shows SET language = 'Telugu'  WHERE slug = 'bigg-boss-telugu';
UPDATE shows SET language = 'Hindi'   WHERE slug = 'indian-idol';
UPDATE shows SET language = 'Hindi'   WHERE slug = 'roadies';
UPDATE shows SET language = 'Hindi'   WHERE slug = 'khatron-ke-khiladi';
UPDATE shows SET language = 'Hindi'   WHERE slug = 'splitsvilla';

-- Update season descriptions and hero images
UPDATE seasons SET
    description = 'The eighth season of Bigg Boss Tamil brings together 18 iconic personalities under one roof for 100 days of drama, tasks, and eliminations.',
    hero_image  = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200'
WHERE id = 1;

UPDATE seasons SET
    description = 'Season 7 of Bigg Boss Tamil concluded with a thrilling finale that kept fans on edge.',
    hero_image  = 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200'
WHERE id = 2;

UPDATE seasons SET
    description = 'Bigg Boss Telugu Season 8 returns with more drama, more tasks, and more eliminations.',
    hero_image  = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200'
WHERE id = 3;

UPDATE seasons SET
    description = 'Indian Idol Season 15 searches for the next big voice of India.',
    hero_image  = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200'
WHERE id = 4;

UPDATE seasons SET
    description = 'Roadies Season 20 takes contestants through the most grueling challenges yet.',
    hero_image  = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200'
WHERE id = 5;

-- Update episode descriptions and thumbnails (season 1 = BB Tamil S8)
UPDATE episodes SET
    description      = 'The grand launch night welcomes all 18 contestants to the Bigg Boss house. Host Kamal Haasan sets the tone for an electrifying season.',
    thumbnail        = 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600',
    duration_minutes = 60
WHERE season_id = 1 AND episode_number = 1;

UPDATE episodes SET
    description      = 'Contestants receive their first nomination task and alliances begin to form within the house.',
    thumbnail        = 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600',
    duration_minutes = 55
WHERE season_id = 1 AND episode_number = 2;

UPDATE episodes SET
    description      = 'The first major task of the season kicks off with contestants competing for captaincy.',
    thumbnail        = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600',
    duration_minutes = 58
WHERE season_id = 1 AND episode_number = 3;

UPDATE episodes SET
    description      = 'The first elimination of the season shocks the house as one contestant is evicted.',
    thumbnail        = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600',
    duration_minutes = 62
WHERE season_id = 1 AND episode_number = 4;

UPDATE episodes SET
    description      = 'The premiere night of Bigg Boss Telugu Season 8 welcomes a star-studded cast.',
    thumbnail        = 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600',
    duration_minutes = 65
WHERE season_id = 3 AND episode_number = 1;

UPDATE episodes SET
    description      = 'Week two brings unexpected twists as contestants settle into their new home.',
    thumbnail        = 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600',
    duration_minutes = 55
WHERE season_id = 3 AND episode_number = 2;

-- Update contestant cover images
UPDATE contestants SET cover_image = 'https://images.unsplash.com/photo-1501163109389-abf35b2e6b60?w=800' WHERE slug = 'aravind'       AND season_id = 1;
UPDATE contestants SET cover_image = 'https://images.unsplash.com/photo-1503249023995-51b0f3778ccf?w=800' WHERE slug = 'priya-raman'   AND season_id = 1;
UPDATE contestants SET cover_image = 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800' WHERE slug = 'karthik-raj'   AND season_id = 1;
UPDATE contestants SET cover_image = 'https://images.unsplash.com/photo-1499084732479-de2c02d45fcc?w=800' WHERE slug = 'meena-krishnan' AND season_id = 1;
UPDATE contestants SET cover_image = 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=800' WHERE slug = 'selvam'        AND season_id = 1;
UPDATE contestants SET cover_image = 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800' WHERE slug = 'anitha-devi'   AND season_id = 1;
UPDATE contestants SET cover_image = 'https://images.unsplash.com/photo-1501163109389-abf35b2e6b60?w=800' WHERE slug = 'rahul-singh'   AND season_id = 3;
UPDATE contestants SET cover_image = 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800' WHERE slug = 'divya-patel'   AND season_id = 3;
