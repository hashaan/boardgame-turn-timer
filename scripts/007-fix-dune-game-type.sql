-- Fix the "Dune" game to have correct type
UPDATE games 
SET game_type = 'dune' 
WHERE name = 'Dune';

-- Verify both Dune games are properly configured
SELECT 
  name as game_name, 
  game_type,
  id as game_id
FROM games 
WHERE name = 'Dune' OR game_type = 'dune'
ORDER BY name;
