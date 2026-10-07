-- V2: Seed data for FanClash
-- Sample data for development and staging environments

INSERT INTO shows (name, slug, category, description, status, image_url)
VALUES
    ('Bigg Boss Tamil', 'bigg-boss-tamil', 'reality-tv',
     'The Tamil edition of India''s most popular reality show where contestants live together under one roof.',
     'live', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800'),
    ('Bigg Boss Telugu', 'bigg-boss-telugu', 'reality-tv',
     'Telugu edition of the iconic reality show with dramatic twists and eliminations.',
     'live', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800'),
    ('Indian Idol', 'indian-idol', 'music',
     'India''s biggest singing reality show searching for the next musical superstar.',
     'upcoming', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800'),
    ('Roadies', 'roadies', 'reality-tv',
     'An adventurous reality show testing contestants'' physical and mental strength.',
     'upcoming', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'),
    ('Khatron Ke Khiladi', 'khatron-ke-khiladi', 'reality-tv',
     'India''s biggest stunt-based reality show featuring Bollywood celebrities.',
     'completed', 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800'),
    ('Splitsvilla', 'splitsvilla', 'reality-tv',
     'A dating reality show where contestants compete for love and connection.',
     'upcoming', 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=800');

INSERT INTO seasons (show_id, name, season_number, status, start_date, end_date)
VALUES
    (1, 'Bigg Boss Tamil Season 8', 8, 'live', '2024-10-01', NULL),
    (1, 'Bigg Boss Tamil Season 7', 7, 'completed', '2024-03-01', '2024-06-30'),
    (2, 'Bigg Boss Telugu Season 8', 8, 'live', '2024-09-15', NULL),
    (3, 'Indian Idol Season 15', 15, 'upcoming', '2025-01-01', NULL),
    (4, 'Roadies Season 20', 20, 'upcoming', '2025-02-01', NULL);

INSERT INTO episodes (season_id, episode_number, title, air_date, status)
VALUES
    (1, 1, 'Grand Launch', '2024-10-01', 'aired'),
    (1, 2, 'First Nominations', '2024-10-06', 'aired'),
    (1, 3, 'Task Week Begins', '2024-10-07', 'live'),
    (1, 4, 'Elimination Night', '2024-10-08', 'upcoming'),
    (3, 1, 'Season Premiere', '2024-09-15', 'aired'),
    (3, 2, 'Week Two Drama', '2024-09-22', 'aired');

INSERT INTO contestants (season_id, name, slug, profile_image, bio, status)
VALUES
    (1, 'Aravind', 'aravind', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
     'A popular actor known for his comic roles.', 'active'),
    (1, 'Priya Raman', 'priya-raman', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
     'A dancer and social media influencer.', 'active'),
    (1, 'Karthik Raj', 'karthik-raj', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
     'A fitness trainer and model.', 'active'),
    (1, 'Meena Krishnan', 'meena-krishnan', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
     'A TV actress with millions of fans.', 'active'),
    (1, 'Selvam', 'selvam', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
     'A street dancer turned celebrity.', 'eliminated'),
    (1, 'Anitha Devi', 'anitha-devi', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
     'A classical singer and performer.', 'active'),
    (3, 'Rahul Singh', 'rahul-singh', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
     'A Telugu actor making his comeback.', 'active'),
    (3, 'Divya Patel', 'divya-patel', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',
     'A model and reality TV veteran.', 'active');
