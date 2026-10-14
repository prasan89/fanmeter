-- Reset sourceVerified on Tamil Week 6 poll so the next sync re-crawls all nominees.
-- Background: poll was marked verified with only 7/8 nominees (TTF Vasan was missed
-- because the wildcard entrant was not in the DB when the first sync ran).
-- After contestant audit (V15) added TTF Vasan (id=104), a re-sync will now match all 8.
UPDATE eviction_polls
SET source_verified = false,
    nomination_state = 'NEEDS_VERIFICATION',
    updated_at = NOW()
WHERE id = 4
  AND season_id = 6
  AND week_number = 6;
