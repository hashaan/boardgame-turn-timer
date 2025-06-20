-- Delete test games from group a7fne7, keeping only the "Dune" game
-- First, let's see what games exist in this group
SELECT id, name, game_type, created_at 
FROM games 
WHERE group_id = 'a7fne7' 
ORDER BY created_at;

-- Delete playthroughs for games we're about to delete (except Dune game)
DELETE FROM playthroughs 
WHERE game_id IN (
  SELECT id FROM games 
  WHERE group_id = 'a7fne7' 
  AND name != 'Dune'
);

-- Delete the test games (keeping only Dune)
DELETE FROM games 
WHERE group_id = 'a7fne7' 
AND name != 'Dune';

-- Verify what's left
SELECT id, name, game_type, created_at 
FROM games 
WHERE group_id = 'a7fne7' 
ORDER BY created_at;
