-- Test script to verify advanced stats are working correctly

-- Check if all columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'playthrough_results' 
  AND column_name IN (
    'leader_id', 'leader_name', 'final_vp', 
    'final_resources_spice', 'final_resources_solari', 
    'final_resources_water', 'final_resources_troops',
    'cards_trashed', 'final_deck_size', 
    'strategic_archetype_id', 'strategic_archetype_name'
  )
ORDER BY column_name;

-- Check existing data structure
SELECT 
  p.id as playthrough_id,
  g.game_type,
  pr.player_name,
  pr.rank,
  pr.leader_name,
  pr.final_vp,
  pr.final_resources_spice,
  pr.final_resources_solari,
  pr.final_resources_water,
  pr.final_resources_troops,
  pr.cards_trashed,
  pr.final_deck_size,
  pr.strategic_archetype_name
FROM playthroughs p
JOIN games g ON p.game_id = g.id
JOIN playthrough_results pr ON p.id = pr.playthrough_id
WHERE g.game_type = 'dune'
ORDER BY p.timestamp DESC, pr.rank
LIMIT 10;

-- Count playthroughs with advanced stats
SELECT 
  g.game_type,
  COUNT(*) as total_playthroughs,
  COUNT(CASE WHEN pr.leader_name IS NOT NULL THEN 1 END) as with_leader,
  COUNT(CASE WHEN pr.final_vp IS NOT NULL THEN 1 END) as with_vp,
  COUNT(CASE WHEN pr.strategic_archetype_name IS NOT NULL THEN 1 END) as with_archetype
FROM playthroughs p
JOIN games g ON p.game_id = g.id
LEFT JOIN playthrough_results pr ON p.id = pr.playthrough_id
GROUP BY g.game_type
ORDER BY g.game_type;
