-- V14: Add nomination_state column to eviction_polls
-- Values: NOMINATIONS_PUBLISHED, NEEDS_VERIFICATION, SOURCE_UNAVAILABLE,
--         NO_NOMINATIONS_CONFIRMED, POLL_OPEN, VOTING_CLOSED

ALTER TABLE eviction_polls
    ADD COLUMN IF NOT EXISTS nomination_state VARCHAR(40)
        CHECK (nomination_state IS NULL OR nomination_state IN (
            'NOMINATIONS_PUBLISHED',
            'NEEDS_VERIFICATION',
            'SOURCE_UNAVAILABLE',
            'NO_NOMINATIONS_CONFIRMED',
            'POLL_OPEN',
            'VOTING_CLOSED'
        ));

-- Back-fill existing rows
UPDATE eviction_polls
SET nomination_state = CASE
    WHEN status = 'open'   AND source_verified = true  THEN 'NOMINATIONS_PUBLISHED'
    WHEN status = 'open'   AND source_verified = false THEN 'NEEDS_VERIFICATION'
    WHEN status = 'closed'                              THEN 'VOTING_CLOSED'
    WHEN status = 'draft'                               THEN 'NEEDS_VERIFICATION'
    ELSE 'NEEDS_VERIFICATION'
END
WHERE nomination_state IS NULL;
