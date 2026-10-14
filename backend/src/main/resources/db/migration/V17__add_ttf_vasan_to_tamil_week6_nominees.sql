-- Manually insert TTF Vasan (id=104) into Tamil Week 6 eviction poll (id=4).
-- Background: HousePulse nominations page HTML does not include TTF Vasan in a
-- way that Jsoup's article selector can extract (likely JS-rendered or structural
-- difference). The voting page confirms all 8 nominees including TTF Vasan.
-- Also re-mark the poll as verified+open with 8 nominees.
INSERT INTO eviction_nominees (poll_id, contestant_id, confirmed, added_by, admin_notes, created_at)
SELECT 4, 104, true, 'admin', 'TTF Vasan — manually added; confirmed on HousePulse week-6 voting page', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM eviction_nominees WHERE poll_id = 4 AND contestant_id = 104
);

UPDATE eviction_polls
SET source_verified = true,
    nomination_state = 'NOMINATIONS_PUBLISHED',
    status = 'open',
    updated_at = NOW()
WHERE id = 4
  AND season_id = 6
  AND week_number = 6;
