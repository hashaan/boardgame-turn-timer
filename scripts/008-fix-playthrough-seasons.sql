-- Check current playthrough season assignments
SELECT 'Current playthrough seasons:' as info;
SELECT 
  p.id,
  p.game_id,
  p.season_id,
  g.name as game_name,
  s.season_number,
  s.status as season_status
FROM playthroughs p
JOIN games g ON p.game_id = g.id
LEFT JOIN seasons s ON p.season_id = s.id
ORDER BY p.timestamp DESC
LIMIT 10;

-- Update playthroughs without season_id to use the active season for their game
UPDATE playthroughs 
SET season_id = (
  SELECT s.id 
  FROM seasons s 
  WHERE s.game_id = playthroughs.game_id 
  AND s.status = 'active' 
  LIMIT 1
)
WHERE season_id IS NULL;

-- Verify the fix
SELECT 'After fix:' as info;
SELECT 
  p.id,
  p.game_id,
  p.season_id,
  g.name as game_name,
  s.season_number,
  s.status as season_status
FROM playthroughs p
JOIN games g ON p.game_id = g.id
LEFT JOIN seasons s ON p.season_id = s.id
WHERE p.season_id IS NOT NULL
ORDER BY p.timestamp DESC
LIMIT 10;
