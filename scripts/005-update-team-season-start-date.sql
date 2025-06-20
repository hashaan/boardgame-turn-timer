-- Update Season 1 start date to May 25th specifically for group "Team" with code "A7FNE7"
UPDATE seasons 
SET start_date = '2024-05-25 00:00:00+00'::timestamp with time zone
WHERE season_number = 1 
  AND group_id = (
    SELECT id FROM groups 
    WHERE code = 'A7FNE7' AND name = 'Team'
    LIMIT 1
  );

-- Verify the update
SELECT 
  g.name as group_name,
  g.code as group_code,
  s.season_number,
  s.start_date,
  s.status
FROM seasons s
JOIN groups g ON s.group_id = g.id
WHERE g.code = 'A7FNE7' AND g.name = 'Team' AND s.season_number = 1;
