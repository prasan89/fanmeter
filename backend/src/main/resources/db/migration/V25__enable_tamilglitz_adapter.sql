-- V25: Enable TamilGlitz Polldaddy adapter
-- TamilGlitz embeds Crowdsignal/Polldaddy polls for Bigg Boss vote tracking.
-- Results are fetched via polls.polldaddy.com/vote-js.php?p={pollId} — a public widget API.
-- Tamil: poll 11073604, Telugu: poll 10967724
UPDATE sentiment_sources
SET enabled    = TRUE,
    notes      = 'TamilGlitz fan polls via Crowdsignal/Polldaddy widget API. Tamil (poll 11073604) and Telugu (poll 10967724). Results fetched from polls.polldaddy.com/vote-js.php?p={id}.',
    updated_at = NOW()
WHERE source_key = 'tamilglitz';
